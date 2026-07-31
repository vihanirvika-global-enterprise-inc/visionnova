import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/orders', () => ({ getOrdersAwaitingDispatch: vi.fn() }))
vi.mock('./actions', () => ({ markOrderShipped: vi.fn() }))

import { getOrdersAwaitingDispatch } from '@/lib/orders'
import AdminOrdersPage from './page'

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
})

describe('AdminOrdersPage', () => {
  it('lists orders awaiting dispatch', async () => {
    render(await AdminOrdersPage())

    expect(screen.getByText(/order-001/)).toBeInTheDocument()
    expect(screen.getByText(/Bengaluru/)).toBeInTheDocument()
  })

  // Without inputs there is no way to record what actually shipped, which is
  // the whole reason the columns exist.
  it('offers carrier and tracking-number inputs per order', async () => {
    render(await AdminOrdersPage())

    expect(screen.getByLabelText(/carrier/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tracking number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark shipped/i })).toBeInTheDocument()
  })

  it('carries the order id through the form', async () => {
    const { container } = render(await AdminOrdersPage())

    const hidden = container.querySelector('input[name="orderId"]')
    expect(hidden).toHaveValue('order-001')
  })

  it('shows an empty state when nothing is awaiting dispatch', async () => {
    vi.mocked(getOrdersAwaitingDispatch).mockResolvedValue([])

    render(await AdminOrdersPage())

    expect(screen.getByText(/no orders awaiting dispatch/i)).toBeInTheDocument()
  })
})
