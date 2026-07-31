import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

const { mockGetCustomerById, mockSendOrderShippedEmail } = vi.hoisted(() => ({
  mockGetCustomerById: vi.fn(),
  mockSendOrderShippedEmail: vi.fn(),
}))

vi.mock('./db', () => ({ sql: vi.fn() }))
vi.mock('./customers', () => ({ getCustomerById: mockGetCustomerById }))
vi.mock('./email', () => ({ sendOrderShippedEmail: mockSendOrderShippedEmail }))

describe('createOrder', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts an order and returns it', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    mockSql(sql).mockResolvedValueOnce([{
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
    mockSql(sql).mockResolvedValueOnce([
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

describe('getOrderById', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns an order when found', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    mockSql(sql).mockResolvedValueOnce([{
      id: 'order-001', customer_id: 'cust-001', status: 'pending',
      total_amount: '89.99',
      shipping_address: { line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
      created_at: now, updated_at: now,
    }])

    const { getOrderById } = await import('./orders')
    const result = await getOrderById('order-001')

    expect(result?.id).toBe('order-001')
    expect(result?.totalAmount).toBe(89.99)
  })

  it('returns null when order is not found', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getOrderById } = await import('./orders')
    expect(await getOrderById('nonexistent')).toBeNull()
  })
})

describe('updateOrderStatus', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  const orderRow = (status: string, now = new Date()) => ({
    id: 'order-001', customer_id: 'cust-001', status,
    total_amount: '89.99',
    shipping_address: { line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
    created_at: now, updated_at: now,
  })

  it('updates status and returns the updated order', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([orderRow('shipped')])

    const { updateOrderStatus } = await import('./orders')
    const result = await updateOrderStatus('order-001', 'shipped')

    expect(result.id).toBe('order-001')
    expect(result.status).toBe('shipped')
  })

  it('sends shipped email when status transitions to shipped', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([orderRow('shipped')])
    mockGetCustomerById.mockResolvedValueOnce({
      id: 'cust-001', email: 'sam@example.com', firstName: 'Sam',
      lastName: 'Jones', passwordHash: '', phone: null,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const { updateOrderStatus } = await import('./orders')
    await updateOrderStatus('order-001', 'shipped')

    expect(mockSendOrderShippedEmail).toHaveBeenCalledWith({
      to: 'sam@example.com',
      firstName: 'Sam',
      orderId: 'order-001',
    })
  })

  it('does not send email for non-shipped status transitions', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([orderRow('paid')])

    const { updateOrderStatus } = await import('./orders')
    await updateOrderStatus('order-001', 'paid')

    expect(mockSendOrderShippedEmail).not.toHaveBeenCalled()
  })
})
