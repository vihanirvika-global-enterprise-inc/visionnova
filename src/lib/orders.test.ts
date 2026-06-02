import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('createOrder', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts an order and returns it', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    vi.mocked(sql).mockResolvedValueOnce([{
      id: 'order-001',
      customer_id: 'cust-001',
      status: 'pending',
      total_amount: '179.98',
      shipping_address: { line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
      created_at: now,
      updated_at: now,
    }])

    const { createOrder } = await import('./orders')
    const result = await createOrder({
      customerId: 'cust-001',
      totalAmount: 179.98,
      shippingAddress: { line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
    })

    expect(sql).toHaveBeenCalledOnce()
    expect(result.id).toBe('order-001')
    expect(result.status).toBe('pending')
    expect(result.totalAmount).toBe(179.98)
  })
})

describe('getOrdersByCustomer', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns all orders for a customer', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    vi.mocked(sql).mockResolvedValueOnce([
      {
        id: 'order-001',
        customer_id: 'cust-001',
        status: 'delivered',
        total_amount: '179.98',
        shipping_address: { line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
        created_at: now,
        updated_at: now,
      },
    ])

    const { getOrdersByCustomer } = await import('./orders')
    const result = await getOrdersByCustomer('cust-001')

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
    expect(result[0].customerId).toBe('cust-001')
    expect(result[0].status).toBe('delivered')
  })
})
