import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/orders', () => ({ getOrdersAwaitingDispatch: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
}))
vi.mock('./actions', () => ({ markOrderShipped: vi.fn(), bulkUpdateOrders: vi.fn() }))

import { getOrdersAwaitingDispatch } from '@/lib/orders'
import { getSession } from '@/lib/session'
import AdminOrdersPage from './page'

const STAFF_ID = 'a58630d6-35ef-4135-8f79-c39c2e99fa4b'

// Shared so the gating tests render exactly the way the existing ones do.
async function renderPage(searchParams: { error?: string } = {}) {
  return render(await AdminOrdersPage({ searchParams }))
}

const order = {
  id: 'order-001',
  customerId: 'cust-001',
  status: 'paid' as const,
  totalAmount: 2499,
  shippingAddress: {
    line1: '1 MG Road', city: 'Bengaluru', state: 'KA',
    postalCode: '560001', country: 'IN',
  },
  carrier: null,
  trackingNumber: null,
  shippedAt: null,
  deliveredAt: null,
  createdAt: new Date('2026-07-18T09:00:00Z'),
  updatedAt: new Date('2026-07-18T09:00:00Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getOrdersAwaitingDispatch).mockResolvedValue([order])
  vi.mocked(getSession).mockReturnValue({ customerId: STAFF_ID, role: 'ops' })
})

describe('AdminOrdersPage', () => {
  it('lists orders awaiting dispatch', async () => {
    render(await AdminOrdersPage({}))

    expect(screen.getByText(/Order #order-001/)).toBeInTheDocument()
    expect(screen.getByText(/Bengaluru/)).toBeInTheDocument()
  })

  // Without inputs there is no way to record what actually shipped, which is
  // the whole reason the columns exist.
  it('offers carrier and tracking-number inputs per order', async () => {
    render(await AdminOrdersPage({}))

    expect(screen.getByLabelText(/carrier/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tracking number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark shipped/i })).toBeInTheDocument()
  })

  it('carries the order id through the form', async () => {
    const { container } = render(await AdminOrdersPage({}))

    const hidden = container.querySelector('input[name="orderId"]')
    expect(hidden).toHaveValue('order-001')
  })

  it('shows an empty state when nothing is awaiting dispatch', async () => {
    vi.mocked(getOrdersAwaitingDispatch).mockResolvedValue([])

    render(await AdminOrdersPage({}))

    expect(screen.getByText(/no orders awaiting dispatch/i)).toBeInTheDocument()
  })

  // ST-027 Order Operations: a bulk toolbar sits above the per-order cards
  // so staff aren't limited to one status transition at a time.
  it('offers a bulk-selection checkbox per order', async () => {
    render(await AdminOrdersPage({}))

    expect(screen.getByLabelText('Select order order-001')).toBeInTheDocument()
  })
})

// This page relied on middleware alone, unlike compliance and support which
// re-check the session themselves. A matcher change or a route move would
// have exposed every customer's name and address with no second line of
// defence.
describe('AdminOrdersPage — role re-check', () => {
  it.each(['ops', 'admin'])('renders for a %s session', async (role) => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockReturnValue({ customerId: STAFF_ID, role })

    await renderPage()

    expect(screen.getByRole('heading', { name: /orders awaiting dispatch/i })).toBeInTheDocument()
  })

  it.each(['optometrist', 'customer', 'partner_optometrist'])('404s a %s session', async (role) => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockReturnValue({ customerId: STAFF_ID, role })

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s with no session, and does not query orders first', async () => {
    const { getSession } = await import('@/lib/session')
    const { getOrdersAwaitingDispatch } = await import('@/lib/orders')
    vi.mocked(getSession).mockReturnValue(null)

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getOrdersAwaitingDispatch).not.toHaveBeenCalled()
  })
})

// The mockup put "Assign to lab" beside "Mark shipped". There is no labs
// table and no orders.lab_id, so the control would collect a choice and
// write it nowhere — on a queue whose whole purpose is tracking where an
// order physically is.
describe('AdminOrdersPage — no lab assignment', () => {
  it('offers no lab assignment control', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockReturnValue({ customerId: STAFF_ID, role: 'ops' })

    const { container } = await renderPage()

    expect(screen.queryByRole('button', { name: /assign to lab|lab/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/lab/i)).not.toBeInTheDocument()
    expect(container.textContent ?? '').not.toMatch(/\blab\b/i)
  })
})
