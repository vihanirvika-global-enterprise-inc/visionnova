import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/customers', () => ({ getCustomerByEmail: vi.fn() }))
vi.mock('@/lib/orders', () => ({ getOrdersByCustomer: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ getPrescriptionsByCustomer: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

import { getSession } from '@/lib/session'
import { getCustomerByEmail } from '@/lib/customers'
import { getOrdersByCustomer } from '@/lib/orders'
import { getPrescriptionsByCustomer } from '@/lib/prescriptions'
import SupportConsolePage from './page'

const customer = {
  id: 'cust-001',
  email: 'sam@example.com',
  firstName: 'Sam',
  lastName: 'Jones',
  phone: '+91 98765 43210',
  role: 'customer' as const,
  createdAt: new Date('2026-01-05T09:00:00Z'),
  updatedAt: new Date('2026-01-05T09:00:00Z'),
}

const order = {
  id: 'order-001',
  customerId: 'cust-001',
  status: 'shipped' as const,
  totalAmount: 2499,
  shippingAddress: { line1: '1 MG Road', city: 'Bengaluru', state: 'KA', postalCode: '560001', country: 'IN' },
  carrier: 'Delhivery',
  trackingNumber: 'DL123456789',
  shippedAt: new Date('2026-07-20T09:00:00Z'),
  deliveredAt: null,
  createdAt: new Date('2026-07-18T09:00:00Z'),
  updatedAt: new Date('2026-07-20T09:00:00Z'),
}

const prescription = {
  id: 'rx-001',
  customerId: 'cust-001',
  fileUrl: 'k.pdf',
  status: 'approved' as const,
  consentGivenAt: new Date('2026-07-01T09:00:00Z'),
  rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null,
  leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null,
  pupillaryDistance: null,
  expiresAt: null,
  createdAt: new Date('2026-07-01T09:00:00Z'),
  updatedAt: new Date('2026-07-01T09:00:00Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockReturnValue({ customerId: 'admin-1', role: 'admin' })
  vi.mocked(getCustomerByEmail).mockResolvedValue(customer as never)
  vi.mocked(getOrdersByCustomer).mockResolvedValue([order] as never)
  vi.mocked(getPrescriptionsByCustomer).mockResolvedValue([prescription] as never)
})

async function renderPage(searchParams: { email?: string } = {}) {
  render(await SupportConsolePage({ searchParams }))
}

describe('SupportConsolePage — gating', () => {
  it('404s an unauthenticated request', async () => {
    vi.mocked(getSession).mockReturnValue(null)

    await expect(renderPage({ email: 'sam@example.com' })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getCustomerByEmail).not.toHaveBeenCalled()
  })

  // Full order + Rx history is exactly the kind of consolidated PII view that
  // shouldn't be reachable by a plain customer role.
  it('404s a plain customer', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-001', role: 'customer' })

    await expect(renderPage({ email: 'sam@example.com' })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getCustomerByEmail).not.toHaveBeenCalled()
  })

  // Contract change: the ops console admits ops, not optometrist. An
  // optometrist's gate is the prescription review queue, which is unchanged.
  it.each(['ops', 'admin'])('allows a %s', async (role) => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'staff-1', role })

    await renderPage({ email: 'sam@example.com' })

    expect(getCustomerByEmail).toHaveBeenCalledWith('sam@example.com')
  })
})

describe('SupportConsolePage — search', () => {
  it('shows only the search form when no lookup has been made yet', async () => {
    await renderPage()

    expect(screen.getByLabelText(/customer email/i)).toBeInTheDocument()
    expect(getCustomerByEmail).not.toHaveBeenCalled()
    expect(screen.queryByText(order.id)).not.toBeInTheDocument()
  })

  it('reports plainly when no customer matches the email', async () => {
    vi.mocked(getCustomerByEmail).mockResolvedValue(null)

    await renderPage({ email: 'nobody@example.com' })

    expect(screen.getByText(/no customer found/i)).toBeInTheDocument()
    expect(getOrdersByCustomer).not.toHaveBeenCalled()
  })
})

describe('SupportConsolePage — customer found', () => {
  it('identifies the customer', async () => {
    await renderPage({ email: 'sam@example.com' })

    expect(screen.getByText('Sam Jones')).toBeInTheDocument()
    expect(screen.getByText('sam@example.com')).toBeInTheDocument()
  })

  it('lists the full order history with shipment details', async () => {
    await renderPage({ email: 'sam@example.com' })

    expect(getOrdersByCustomer).toHaveBeenCalledWith('cust-001')
    expect(screen.getByText(/order-001/)).toBeInTheDocument()
    expect(screen.getByText(/Delhivery/)).toBeInTheDocument()
    expect(screen.getByText(/DL123456789/)).toBeInTheDocument()
  })

  // Clinical values (sphere/cylinder/axis) are deliberately not shown here —
  // opening those is a read of health data and belongs behind the audited
  // door at /admin/prescriptions/[id], not a bulk unaudited fetch on a
  // support search.
  it('lists prescriptions as a summary linking to the audited review screen', async () => {
    await renderPage({ email: 'sam@example.com' })

    expect(getPrescriptionsByCustomer).toHaveBeenCalledWith('cust-001')
    const link = screen.getByRole('link', { name: /rx-001/i })
    expect(link).toHaveAttribute('href', '/admin/prescriptions/rx-001')
    expect(screen.getByText(/approved/i)).toBeInTheDocument()
  })

  it('shows an empty state when the customer has no orders', async () => {
    vi.mocked(getOrdersByCustomer).mockResolvedValue([])

    await renderPage({ email: 'sam@example.com' })

    expect(screen.getByText(/no orders/i)).toBeInTheDocument()
  })

  it('shows an empty state when the customer has no prescriptions', async () => {
    vi.mocked(getPrescriptionsByCustomer).mockResolvedValue([])

    await renderPage({ email: 'sam@example.com' })

    expect(screen.getByText(/no prescriptions/i)).toBeInTheDocument()
  })
})
