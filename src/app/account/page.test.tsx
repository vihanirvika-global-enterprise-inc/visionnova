import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/orders', () => ({ getOrdersByCustomer: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ getPrescriptionsByCustomer: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))

describe('AccountPage', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-001', role: 'customer' })
  })

  it('shows an empty state when there are no orders', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
    vi.mocked(getOrdersByCustomer).mockResolvedValueOnce([])
    vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce([])

    const AccountPage = (await import('./page')).default
    render(await AccountPage())

    expect(screen.getByText('No orders yet')).toBeInTheDocument()
  })

  it('renders a list of orders for the customer', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
    vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce([])
    const now = new Date()
    vi.mocked(getOrdersByCustomer).mockResolvedValueOnce([
      {
        id: 'order-001',
        customerId: 'cust-001',
        status: 'delivered' as const,
        totalAmount: 89.99,
        shippingAddress: { line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
        carrier: null, trackingNumber: null, shippedAt: null, deliveredAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const AccountPage = (await import('./page')).default
    render(await AccountPage())

    expect(screen.getByText(/order-001/)).toBeInTheDocument()
    expect(screen.getByText(/delivered/)).toBeInTheDocument()
  })

  it('links each order to its tracking screen', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
    const now = new Date()
    vi.mocked(getOrdersByCustomer).mockResolvedValueOnce([
      {
        id: 'order-001', customerId: 'cust-001', status: 'shipped' as const,
        totalAmount: 2499,
        shippingAddress: { line1: '1 MG Road', city: 'Bengaluru', state: 'KA', postalCode: '560001', country: 'IN' },
        carrier: null, trackingNumber: null, shippedAt: null, deliveredAt: null,
        createdAt: now, updatedAt: now,
      },
    ])
    vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce([])

    const AccountPage = (await import('./page')).default
    render(await AccountPage())

    expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute(
      'href',
      '/order/order-001'
    )
  })

  // Prices are INR; a dollar sign on a rupee figure misstates the amount by ~83x.
  it('shows order totals in rupees, never dollars', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
    const now = new Date()
    vi.mocked(getOrdersByCustomer).mockResolvedValueOnce([
      {
        id: 'order-001', customerId: 'cust-001', status: 'delivered' as const,
        totalAmount: 2499,
        shippingAddress: { line1: '1 MG Road', city: 'Bengaluru', state: 'KA', postalCode: '560001', country: 'IN' },
        carrier: null, trackingNumber: null, shippedAt: null, deliveredAt: null,
        createdAt: now, updatedAt: now,
      },
    ])
    vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce([])

    const AccountPage = (await import('./page')).default
    render(await AccountPage())

    const total = screen.getByTestId('order-total-order-001')
    expect(total).toHaveTextContent('₹')
    expect(total).not.toHaveTextContent('$')
  })

  it('renders a link to upload a prescription', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
    vi.mocked(getOrdersByCustomer).mockResolvedValueOnce([])
    vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce([])

    const AccountPage = (await import('./page')).default
    render(await AccountPage())

    const link = screen.getByRole('link', { name: /upload prescription/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/prescription-upload')
  })

  it('fetches orders and prescriptions for the session customer', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
    vi.mocked(getOrdersByCustomer).mockResolvedValueOnce([])
    vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce([])

    const AccountPage = (await import('./page')).default
    render(await AccountPage())

    expect(getOrdersByCustomer).toHaveBeenCalledWith('cust-001')
    expect(getPrescriptionsByCustomer).toHaveBeenCalledWith('cust-001')
  })

  it('renders the customer prescription status', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
    vi.mocked(getOrdersByCustomer).mockResolvedValueOnce([])
    vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce([{
      id: 'rx-001', customerId: 'cust-001',
      fileUrl: 'https://storage.example.com/rx-001.pdf',
      status: 'approved' as const,
      rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null,
      leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null,
      pupillaryDistance: null, expiresAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    }])

    const AccountPage = (await import('./page')).default
    render(await AccountPage())

    expect(screen.getByText(/approved/i)).toBeInTheDocument()
  })
})
