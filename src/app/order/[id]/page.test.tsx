import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/orders', () => ({ getOrderById: vi.fn() }))
vi.mock('@/lib/orderItems', () => ({ getOrderItems: vi.fn() }))
vi.mock('@/lib/products', () => ({ getProductById: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }) }))

import { getSession } from '@/lib/session'
import { getOrderById } from '@/lib/orders'
import { getOrderItems } from '@/lib/orderItems'
import { getProductById } from '@/lib/products'
import { notFound } from 'next/navigation'
import OrderDetailPage from './page'

const OWNER = 'cust-owner'
const ORDER_ID = 'order-1'

const shippingAddress = {
  line1: '123 MG Road',
  city: 'Bengaluru',
  state: 'KA',
  postalCode: '560001',
  country: 'IN',
}

function givenOrder(overrides: Record<string, unknown> = {}) {
  vi.mocked(getOrderById).mockResolvedValue({
    id: ORDER_ID,
    customerId: OWNER,
    status: 'shipped',
    totalAmount: 2499,
    shippingAddress,
    carrier: 'Delhivery',
    trackingNumber: 'DL123456789',
    shippedAt: new Date('2026-07-04T08:00:00Z'),
    deliveredAt: null,
    createdAt: new Date('2026-07-01T10:00:00Z'),
    updatedAt: new Date('2026-07-05T10:00:00Z'),
    ...overrides,
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
  givenOrder()
  vi.mocked(getOrderItems).mockResolvedValue([
    { id: 'oi-1', orderId: ORDER_ID, productId: 'p-1', prescriptionId: null, quantity: 2, unitPrice: 999 },
  ] as never)
  vi.mocked(getProductById).mockResolvedValue({ id: 'p-1', name: 'Classic Frame' } as never)
})

async function renderPage() {
  render(await OrderDetailPage({ params: { id: ORDER_ID } }))
}

describe('OrderDetailPage — ownership gate', () => {
  it('404s when there is no session', async () => {
    vi.mocked(getSession).mockReturnValue(null)

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  // notFound rather than a 403: telling a stranger the order exists is itself a leak.
  it('404s for a customer who does not own the order', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-other', role: 'customer' })

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s for an unknown order', async () => {
    vi.mocked(getOrderById).mockResolvedValue(null)

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('OrderDetailPage — detail', () => {
  it('shows the order reference and placed date', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(ORDER_ID)
    expect(screen.getByTestId('order-placed-date')).toBeInTheDocument()
  })

  it('shows the total in rupees, never dollars', async () => {
    await renderPage()

    const total = screen.getByTestId('order-total')
    expect(total).toHaveTextContent('₹')
    expect(total).not.toHaveTextContent('$')
  })

  it('lists the ordered items with product names and quantities', async () => {
    await renderPage()

    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByTestId('order-item-oi-1')).toHaveTextContent('2')
  })

  it('still renders when a product has since been removed', async () => {
    vi.mocked(getProductById).mockResolvedValue(null)

    await renderPage()

    expect(screen.getByTestId('order-item-oi-1')).toBeInTheDocument()
  })

  it('renders the status timeline', async () => {
    await renderPage()

    expect(screen.getByRole('list', { name: /order progress/i })).toBeInTheDocument()
  })
})

describe('OrderDetailPage — shipment info', () => {
  it('shows the shipping address', async () => {
    await renderPage()

    const shipment = screen.getByTestId('shipment-info')
    expect(shipment).toHaveTextContent('123 MG Road')
    expect(shipment).toHaveTextContent('Bengaluru')
    expect(shipment).toHaveTextContent('560001')
  })

  it('shows the carrier and tracking number', async () => {
    await renderPage()

    const shipment = screen.getByTestId('shipment-info')
    expect(shipment).toHaveTextContent('Delhivery')
    expect(shipment).toHaveTextContent('DL123456789')
  })

  // The dispatch date must come from shipped_at, not updated_at, which moves
  // whenever the row is touched for any other reason.
  it('shows the dispatch date from shippedAt', async () => {
    await renderPage()

    expect(screen.getByTestId('shipped-date')).toHaveTextContent('4')
  })

  it('shows a delivery date once delivered', async () => {
    givenOrder({ status: 'delivered', deliveredAt: new Date('2026-07-09T08:00:00Z') })

    await renderPage()

    expect(screen.getByTestId('delivered-date')).toBeInTheDocument()
  })

  it('does not claim a dispatch date before the order ships', async () => {
    givenOrder({ status: 'processing', shippedAt: null, carrier: null, trackingNumber: null })

    await renderPage()

    expect(screen.queryByTestId('shipped-date')).not.toBeInTheDocument()
    expect(screen.queryByTestId('delivered-date')).not.toBeInTheDocument()
  })

  // Rows predating the shipment columns are shipped with everything null.
  it('degrades gracefully when a shipped order has no tracking recorded', async () => {
    givenOrder({ status: 'shipped', carrier: null, trackingNumber: null, shippedAt: null })

    await renderPage()

    expect(screen.getByTestId('shipment-info')).toBeInTheDocument()
    expect(screen.queryByTestId('shipped-date')).not.toBeInTheDocument()
    expect(screen.getByText(/tracking details are not available/i)).toBeInTheDocument()
  })
})

// ST-017 (B2. My Orders & Order Detail — return/exchange).
describe('OrderDetailPage — return/exchange', () => {
  it('offers a return/exchange request once the order is delivered', async () => {
    givenOrder({ status: 'delivered', deliveredAt: new Date('2026-07-09T08:00:00Z') })

    await renderPage()

    const link = screen.getByRole('link', { name: /request return/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:support@visionnova.com'))
    expect(link).toHaveAttribute('href', expect.stringContaining(ORDER_ID))
  })

  it('does not offer a return/exchange request before delivery', async () => {
    givenOrder({ status: 'shipped' })

    await renderPage()

    expect(screen.queryByRole('link', { name: /request return/i })).not.toBeInTheDocument()
  })
})
