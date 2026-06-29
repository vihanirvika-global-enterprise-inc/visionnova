import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prescriptions', () => ({ getPendingPrescriptions: vi.fn() }))

const now = new Date()
const makePrescription = (overrides: Record<string, unknown> = {}) => ({
  id: 'rx-001', customerId: 'cust-001',
  fileUrl: '/uploads/rx-001.pdf',
  status: 'pending' as const,
  rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null,
  leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null,
  pupillaryDistance: null, expiresAt: null,
  createdAt: now, updatedAt: now,
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  ...overrides,
})

describe('AdminPrescriptionsPage', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

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
