import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prescriptions', () => ({ getPendingPrescriptions: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

const now = new Date()
const makePrescription = (overrides: Record<string, unknown> = {}) => ({
  id: 'rx-001', customerId: 'cust-001',
  fileUrl: '/uploads/rx-001.pdf',
  status: 'pending' as const,
  consentGivenAt: now,
  rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null,
  leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null,
  pupillaryDistance: null, expiresAt: null,
  createdAt: now, updatedAt: now,
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  ...overrides,
})

describe('AdminPrescriptionsPage', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockReturnValue({ customerId: 'reviewer-001', role: 'optometrist' })
  })

  it('renders a row for each pending prescription', async () => {
    const { getPendingPrescriptions } = await import('@/lib/prescriptions')
    vi.mocked(getPendingPrescriptions).mockResolvedValueOnce([
      makePrescription({ id: 'rx-001', customerName: 'Jane Doe' }),
      makePrescription({ id: 'rx-002', customerId: 'cust-002', customerName: 'Bob Smith', customerEmail: 'bob@example.com' }),
    ])

    const AdminPrescriptionsPage = (await import('./page')).default
    render(await AdminPrescriptionsPage())

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('shows a count badge with the number of pending prescriptions', async () => {
    const { getPendingPrescriptions } = await import('@/lib/prescriptions')
    vi.mocked(getPendingPrescriptions).mockResolvedValueOnce([
      makePrescription({ id: 'rx-001' }),
      makePrescription({ id: 'rx-002' }),
      makePrescription({ id: 'rx-003' }),
    ])

    const AdminPrescriptionsPage = (await import('./page')).default
    render(await AdminPrescriptionsPage())

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders a review link for each prescription', async () => {
    const { getPendingPrescriptions } = await import('@/lib/prescriptions')
    vi.mocked(getPendingPrescriptions).mockResolvedValueOnce([
      makePrescription({ id: 'rx-001' }),
    ])

    const AdminPrescriptionsPage = (await import('./page')).default
    render(await AdminPrescriptionsPage())

    const link = screen.getByRole('link', { name: /review/i })
    expect(link).toHaveAttribute('href', '/admin/prescriptions/rx-001')
  })

  it('shows an empty state when no prescriptions are pending', async () => {
    const { getPendingPrescriptions } = await import('@/lib/prescriptions')
    vi.mocked(getPendingPrescriptions).mockResolvedValueOnce([])

    const AdminPrescriptionsPage = (await import('./page')).default
    render(await AdminPrescriptionsPage())

    expect(screen.getByText(/no pending prescriptions/i)).toBeInTheDocument()
  })
})

// The queue lists patient names and email addresses. Middleware gates /admin,
// but this page re-checks rather than trusting a matcher stays correct — the
// same reasoning the access-log page already applies.
describe('AdminPrescriptionsPage — role gate', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it.each([
    ['no session', null],
    ['a plain customer', { customerId: 'cust-001', role: 'customer' }],
    ['ops', { customerId: 'ops-001', role: 'ops' }],
  ])('404s %s without querying the queue', async (_label, session) => {
    const { getSession } = await import('@/lib/session')
    const { getPendingPrescriptions } = await import('@/lib/prescriptions')
    vi.mocked(getSession).mockReturnValue(session as never)

    const AdminPrescriptionsPage = (await import('./page')).default

    await expect(AdminPrescriptionsPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getPendingPrescriptions).not.toHaveBeenCalled()
  })

  it.each(['optometrist', 'admin'])('allows a %s through', async (role) => {
    const { getSession } = await import('@/lib/session')
    const { getPendingPrescriptions } = await import('@/lib/prescriptions')
    vi.mocked(getSession).mockReturnValue({ customerId: 'reviewer-001', role })
    vi.mocked(getPendingPrescriptions).mockResolvedValueOnce([])

    const AdminPrescriptionsPage = (await import('./page')).default
    render(await AdminPrescriptionsPage())

    expect(screen.getByText(/no pending prescriptions/i)).toBeInTheDocument()
  })
})
