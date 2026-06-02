import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/orders', () => ({ getOrdersByCustomer: vi.fn() }))

describe('AccountPage', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('shows an empty state when there are no orders', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    vi.mocked(getOrdersByCustomer).mockResolvedValueOnce([])

    const AccountPage = (await import('./page')).default
    render(await AccountPage())

    expect(screen.getByText('No orders yet')).toBeInTheDocument()
  })

  it('renders a list of orders for the customer', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    const now = new Date()
    vi.mocked(getOrdersByCustomer).mockResolvedValueOnce([
      {
        id: 'order-001',
        customerId: 'cust-001',
        status: 'delivered' as const,
        totalAmount: 89.99,
        shippingAddress: { line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
        createdAt: now,
        updatedAt: now,
      },
    ])

    const AccountPage = (await import('./page')).default
    render(await AccountPage())

    expect(screen.getByText(/order-001/)).toBeInTheDocument()
    expect(screen.getByText(/delivered/)).toBeInTheDocument()
  })
})
