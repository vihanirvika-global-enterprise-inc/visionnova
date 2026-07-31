import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

const { mockGetCustomerById, mockSendOrderShippedEmail, mockCaptureOrderError } = vi.hoisted(() => ({
  mockGetCustomerById: vi.fn(),
  mockSendOrderShippedEmail: vi.fn(),
  mockCaptureOrderError: vi.fn(),
}))

vi.mock('./db', () => ({ sql: vi.fn() }))
vi.mock('./customers', () => ({ getCustomerById: mockGetCustomerById }))
vi.mock('./email', () => ({ sendOrderShippedEmail: mockSendOrderShippedEmail }))
vi.mock('./sentry', () => ({ captureOrderError: mockCaptureOrderError }))

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

  // The status is already written when the email is attempted. Throwing here
  // would report a successful state change as a failure to every caller.
  it('still returns the updated order when the shipped email fails', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([orderRow('shipped')])
    mockGetCustomerById.mockResolvedValue({
      id: 'cust-001', email: 'sam@example.com', firstName: 'Sam',
    })
    mockSendOrderShippedEmail.mockRejectedValue(new Error('Missing API key'))

    const { updateOrderStatus } = await import('./orders')
    const result = await updateOrderStatus('order-001', 'shipped')

    expect(result.status).toBe('shipped')
    expect(mockCaptureOrderError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ orderId: 'order-001' })
    )
  })

  it('does not send email for non-shipped status transitions', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([orderRow('paid')])

    const { updateOrderStatus } = await import('./orders')
    await updateOrderStatus('order-001', 'paid')

    expect(mockSendOrderShippedEmail).not.toHaveBeenCalled()
  })
})

describe('shipment details', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  const shippedRow = (overrides = {}) => ({
    id: 'order-001', customer_id: 'cust-001', status: 'shipped',
    total_amount: '2499.00',
    shipping_address: { line1: '1 MG Road', city: 'Bengaluru', state: 'KA', postalCode: '560001', country: 'IN' },
    carrier: 'Delhivery',
    tracking_number: 'DL123456789',
    shipped_at: new Date('2026-07-20T09:00:00Z'),
    delivered_at: null,
    created_at: new Date('2026-07-18T09:00:00Z'),
    updated_at: new Date('2026-07-20T09:00:00Z'),
  })

  it('maps the shipment columns onto the order', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([shippedRow()])

    const { getOrderById } = await import('./orders')
    const order = await getOrderById('order-001')

    expect(order?.carrier).toBe('Delhivery')
    expect(order?.trackingNumber).toBe('DL123456789')
    expect(order?.shippedAt).toEqual(new Date('2026-07-20T09:00:00Z'))
    expect(order?.deliveredAt).toBeNull()
  })

  it('maps absent shipment columns to null rather than undefined', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{
      ...shippedRow(), carrier: null, tracking_number: null, shipped_at: null,
    }])

    const { getOrderById } = await import('./orders')
    const order = await getOrderById('order-001')

    expect(order?.carrier).toBeNull()
    expect(order?.trackingNumber).toBeNull()
    expect(order?.shippedAt).toBeNull()
  })

  it('records carrier and tracking number when marking an order shipped', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql).mockResolvedValueOnce([shippedRow()])
    mockGetCustomerById.mockResolvedValueOnce(null)

    const { updateOrderStatus } = await import('./orders')
    const order = await updateOrderStatus('order-001', 'shipped', {
      carrier: 'Delhivery',
      trackingNumber: 'DL123456789',
    })

    expect(order.carrier).toBe('Delhivery')
    expect(order.trackingNumber).toBe('DL123456789')
    const params = spy.mock.calls[0].slice(1)
    expect(params).toContain('Delhivery')
    expect(params).toContain('DL123456789')
  })

  // Callers that only change status — both payment webhooks — must not blank
  // shipment details that were already recorded.
  it('leaves shipment details untouched when none are supplied', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql).mockResolvedValueOnce([shippedRow()])
    mockGetCustomerById.mockResolvedValueOnce(null)

    const { updateOrderStatus } = await import('./orders')
    await updateOrderStatus('order-001', 'paid')

    const query = (spy.mock.calls[0][0] as string[]).join('?')
    expect(query).toMatch(/COALESCE/)
  })

  it('stamps shipped_at and delivered_at in SQL, not from the app clock', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql).mockResolvedValueOnce([shippedRow()])
    mockGetCustomerById.mockResolvedValueOnce(null)

    const { updateOrderStatus } = await import('./orders')
    await updateOrderStatus('order-001', 'shipped')

    const query = (spy.mock.calls[0][0] as string[]).join('?')
    expect(query).toMatch(/shipped_at/)
    expect(query).toMatch(/delivered_at/)
    expect(query).toMatch(/NOW\(\)/)
  })
})

describe('getOrdersAwaitingDispatch', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns paid and processing orders, oldest first', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql).mockResolvedValueOnce([{
      id: 'order-001', customer_id: 'cust-001', status: 'paid',
      total_amount: '2499.00',
      shipping_address: { line1: '1 MG Road', city: 'Bengaluru', state: 'KA', postalCode: '560001', country: 'IN' },
      carrier: null, tracking_number: null, shipped_at: null, delivered_at: null,
      created_at: new Date(), updated_at: new Date(),
    }])

    const { getOrdersAwaitingDispatch } = await import('./orders')
    const orders = await getOrdersAwaitingDispatch()

    expect(orders).toHaveLength(1)
    expect(orders[0].status).toBe('paid')
    const query = (spy.mock.calls[0][0] as string[]).join('?')
    expect(query).toMatch(/ORDER BY created_at ASC/)
  })
})
