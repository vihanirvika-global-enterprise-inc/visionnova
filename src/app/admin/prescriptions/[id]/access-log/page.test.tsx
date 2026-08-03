import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ getPrescriptionById: vi.fn() }))
vi.mock('@/lib/prescriptionAccessLogs', () => ({ getAccessLogsByPrescription: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

import { getSession } from '@/lib/session'
import { getPrescriptionById } from '@/lib/prescriptions'
import { getAccessLogsByPrescription } from '@/lib/prescriptionAccessLogs'
import { notFound } from 'next/navigation'
import AccessLogPage from './page'

const RX = 'rx-001'

const logEntry = {
  id: 'log-001',
  prescriptionId: RX,
  accessorId: 'cust-009',
  accessorName: 'Dr Rao',
  accessorRole: 'optometrist',
  accessType: 'file' as const,
  accessedAt: new Date('2026-07-20T09:30:00Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockReturnValue({ customerId: 'admin-1', role: 'admin' })
  vi.mocked(getPrescriptionById).mockResolvedValue({
    id: RX, customerId: 'cust-001', customerName: 'Jane Doe', fileUrl: 'k.pdf',
  } as never)
  vi.mocked(getAccessLogsByPrescription).mockResolvedValue([logEntry] as never)
})

async function renderPage() {
  render(await AccessLogPage({ params: { id: RX } }))
}

describe('AccessLogPage — gating', () => {
  it('404s an unauthenticated request', async () => {
    vi.mocked(getSession).mockReturnValue(null)

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getAccessLogsByPrescription).not.toHaveBeenCalled()
  })

  // The trail names staff who viewed health data — it is not for the customer
  // whose prescription it is, nor any other customer.
  it('404s a plain customer', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-001', role: 'customer' })

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getAccessLogsByPrescription).not.toHaveBeenCalled()
  })

  it.each(['optometrist', 'admin'])('allows a %s', async (role) => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'staff-1', role })

    await renderPage()

    expect(getAccessLogsByPrescription).toHaveBeenCalledWith(RX)
  })

  it('404s an unknown prescription', async () => {
    vi.mocked(getPrescriptionById).mockResolvedValue(null)

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})

describe('AccessLogPage — trail', () => {
  it('names who read the prescription, in what role, and when', async () => {
    await renderPage()

    const row = screen.getByTestId('access-log-log-001')
    expect(row).toHaveTextContent('Dr Rao')
    expect(row).toHaveTextContent('optometrist')
    expect(row).toHaveTextContent('2026')
  })

  it('identifies which prescription the trail belongs to', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(RX)
  })

  // An empty trail is a meaningful answer to a subject-access request, not an
  // error — it means nobody has opened the file.
  it('states plainly when nobody has accessed the file', async () => {
    vi.mocked(getAccessLogsByPrescription).mockResolvedValue([])

    await renderPage()

    expect(screen.getByText(/no one has accessed this prescription/i)).toBeInTheDocument()
  })

  it('links back to the prescription review screen', async () => {
    await renderPage()

    expect(screen.getByRole('link', { name: /back to prescription/i })).toHaveAttribute(
      'href',
      `/admin/prescriptions/${RX}`
    )
  })

  // Opening the record and opening the scanned file are different acts. The
  // trail records both, so it has to say which happened.
  it('distinguishes a file read from a metadata read', async () => {
    vi.mocked(getAccessLogsByPrescription).mockResolvedValue([
      { ...logEntry, id: 'log-file', accessType: 'file' },
      { ...logEntry, id: 'log-meta', accessType: 'metadata' },
    ] as never)

    await renderPage()

    expect(screen.getByTestId('access-log-log-file')).toHaveTextContent(/prescription file/i)
    expect(screen.getByTestId('access-log-log-meta')).toHaveTextContent(/patient record/i)
  })

  // The screen previously claimed to list "every read of this prescription
  // file" — inaccurate now that metadata reads are recorded too.
  it('describes the trail as covering reads of the prescription, not only its file', async () => {
    await renderPage()

    expect(screen.getByText(/every read of this prescription, most recent first/i)).toBeInTheDocument()
  })
})
