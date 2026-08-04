import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/prescriptionAccessLogs', () => ({ getRecentAccessLogs: vi.fn() }))
vi.mock('@/lib/regulatoryRiskStatus', () => ({ getRegulatoryRiskStatus: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

import { getSession } from '@/lib/session'
import { getRecentAccessLogs } from '@/lib/prescriptionAccessLogs'
import { getRegulatoryRiskStatus } from '@/lib/regulatoryRiskStatus'
import CompliancePage from './page'

const logEntry = {
  id: 'log-001',
  prescriptionId: 'rx-001',
  accessorId: 'staff-1',
  accessorName: 'Dr Rao',
  accessorRole: 'optometrist',
  accessType: 'file' as const,
  accessedAt: new Date('2026-07-31T10:00:00Z'),
  patientName: 'Jane Doe',
}

const unconfiguredRiskItems = [
  {
    id: 'regulatory-establishment-registration', riskRef: 'R-01 / REG-01',
    label: 'Regulatory establishment registration for selling prescription eyewear',
    configured: false, detail: 'Not confirmed.',
  },
  {
    id: 'backup-payment-processor', riskRef: 'TECH-01 / FIN-04',
    label: 'Backup payment processor configured',
    configured: false, detail: 'Not configured.',
  },
  {
    id: 'optometrist-staffing-redundancy', riskRef: 'OPS-04 / PEO-02',
    label: 'Minimum two licensed optometrists on staff',
    configured: false, detail: '0 on record.',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockReturnValue({ customerId: 'admin-1', role: 'admin' })
  vi.mocked(getRecentAccessLogs).mockResolvedValue([logEntry])
  vi.mocked(getRegulatoryRiskStatus).mockReturnValue(unconfiguredRiskItems)
})

describe('CompliancePage — gating', () => {
  it('404s an unauthenticated request', async () => {
    vi.mocked(getSession).mockReturnValue(null)

    await expect(CompliancePage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getRecentAccessLogs).not.toHaveBeenCalled()
  })

  it('404s a plain customer', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })

    await expect(CompliancePage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getRecentAccessLogs).not.toHaveBeenCalled()
  })

  it.each(['optometrist', 'admin'])('allows a %s', async (role) => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'staff-1', role })

    render(await CompliancePage())

    expect(getRecentAccessLogs).toHaveBeenCalled()
  })
})

describe('CompliancePage — trail', () => {
  it('names who accessed which patient record, in what role, and when', async () => {
    render(await CompliancePage())

    const row = screen.getByTestId('access-log-log-001')
    expect(row).toHaveTextContent('Dr Rao')
    expect(row).toHaveTextContent('optometrist')
    expect(row).toHaveTextContent('Jane Doe')
    expect(row).toHaveTextContent('2026')
  })

  it('links each row back to the prescription', async () => {
    render(await CompliancePage())

    expect(screen.getByRole('link', { name: /rx-001/i })).toHaveAttribute(
      'href',
      '/admin/prescriptions/rx-001'
    )
  })

  it('distinguishes a file read from a metadata read', async () => {
    vi.mocked(getRecentAccessLogs).mockResolvedValue([
      { ...logEntry, id: 'log-file', accessType: 'file' },
      { ...logEntry, id: 'log-meta', accessType: 'metadata' },
    ])

    render(await CompliancePage())

    expect(screen.getByTestId('access-log-log-file')).toHaveTextContent(/prescription file/i)
    expect(screen.getByTestId('access-log-log-meta')).toHaveTextContent(/patient record/i)
  })

  it('states plainly when there have been no reads', async () => {
    vi.mocked(getRecentAccessLogs).mockResolvedValue([])

    render(await CompliancePage())

    expect(screen.getByText(/no prescription access recorded/i)).toBeInTheDocument()
  })
})

// EP-010 BUG-001/005/012: the console's job here is to make these three
// outstanding business/legal/staffing decisions impossible to miss, not to
// resolve them — resolving them isn't something code can do.
describe('CompliancePage — regulatory risk register', () => {
  it('flags every unconfigured item with its risk reference', async () => {
    render(await CompliancePage())

    expect(screen.getByText(/R-01 \/ REG-01/)).toBeInTheDocument()
    expect(screen.getByText(/TECH-01 \/ FIN-04/)).toBeInTheDocument()
    expect(screen.getByText(/OPS-04 \/ PEO-02/)).toBeInTheDocument()
  })

  it('renders an alert when any risk item is unconfigured', async () => {
    render(await CompliancePage())

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
  })

  it('does not alert an item once it is configured', async () => {
    vi.mocked(getRegulatoryRiskStatus).mockReturnValue([
      { ...unconfiguredRiskItems[0], configured: true, detail: 'Confirmed 2026-08-01' },
      unconfiguredRiskItems[1],
      unconfiguredRiskItems[2],
    ])

    render(await CompliancePage())

    expect(screen.getByText(/Confirmed 2026-08-01/)).toBeInTheDocument()
  })
})
