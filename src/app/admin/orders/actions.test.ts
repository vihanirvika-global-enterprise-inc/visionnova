import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextNavigation from 'next/navigation'
import * as Orders from '@/lib/orders'
import * as Session from '@/lib/session'
import { markOrderShipped, bulkUpdateOrders } from './actions'

vi.mock('@/lib/orders', () => ({ updateOrderStatus: vi.fn(), bulkUpdateOrderStatus: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Session.getSession).mockReturnValue({ customerId: 'admin-1', role: 'admin' })
  vi.mocked(Orders.updateOrderStatus).mockResolvedValue({} as never)
  vi.mocked(Orders.bulkUpdateOrderStatus).mockResolvedValue({ updatedCount: 2 })
})

afterEach(() => { vi.restoreAllMocks() })

describe('markOrderShipped — authorisation', () => {
  it('refuses an unauthenticated request', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    const result = await markOrderShipped(
      formData({ orderId: 'order-1', carrier: 'Delhivery', trackingNumber: 'DL1' })
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.updateOrderStatus).not.toHaveBeenCalled()
  })

  // Dispatch is a fulfilment action, not something any signed-in customer may do.
  it('refuses a plain customer', async () => {
    vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })

    const result = await markOrderShipped(
      formData({ orderId: 'order-1', carrier: 'Delhivery', trackingNumber: 'DL1' })
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.updateOrderStatus).not.toHaveBeenCalled()
  })
})

describe('markOrderShipped — validation', () => {
  it.each([
    ['carrier', { orderId: 'order-1', carrier: '', trackingNumber: 'DL1' }],
    ['tracking number', { orderId: 'order-1', carrier: 'Delhivery', trackingNumber: '' }],
  ])('requires a %s', async (_field, fields) => {
    const result = await markOrderShipped(formData(fields))

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.updateOrderStatus).not.toHaveBeenCalled()
  })

  it('requires an order id', async () => {
    const result = await markOrderShipped(formData({ carrier: 'Delhivery', trackingNumber: 'DL1' }))

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.updateOrderStatus).not.toHaveBeenCalled()
  })
})

describe('markOrderShipped — success', () => {
  it('records the carrier and tracking number against the order', async () => {
    await markOrderShipped(
      formData({ orderId: 'order-1', carrier: ' Delhivery ', trackingNumber: ' DL123 ' })
    )

    expect(Orders.updateOrderStatus).toHaveBeenCalledWith('order-1', 'shipped', {
      carrier: 'Delhivery',
      trackingNumber: 'DL123',
    })
  })

  it('returns the caller to the dispatch queue', async () => {
    await markOrderShipped(
      formData({ orderId: 'order-1', carrier: 'Delhivery', trackingNumber: 'DL123' })
    )

    expect(NextNavigation.redirect).toHaveBeenCalledWith('/admin/orders')
  })
})

describe('bulkUpdateOrders — authorisation', () => {
  it('refuses an unauthenticated request', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    const result = await bulkUpdateOrders(
      formData({ orderIds: 'order-1,order-2', status: 'processing' })
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.bulkUpdateOrderStatus).not.toHaveBeenCalled()
  })

  it('refuses a plain customer', async () => {
    vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })

    const result = await bulkUpdateOrders(
      formData({ orderIds: 'order-1,order-2', status: 'processing' })
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.bulkUpdateOrderStatus).not.toHaveBeenCalled()
  })
})

describe('bulkUpdateOrders — validation', () => {
  it('requires at least one order to be selected', async () => {
    const result = await bulkUpdateOrders(formData({ orderIds: '', status: 'processing' }))

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.bulkUpdateOrderStatus).not.toHaveBeenCalled()
  })

  it('requires a status', async () => {
    const result = await bulkUpdateOrders(formData({ orderIds: 'order-1', status: '' }))

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.bulkUpdateOrderStatus).not.toHaveBeenCalled()
  })
})

describe('bulkUpdateOrders — success', () => {
  it('parses the comma-separated order ids and forwards them with the status', async () => {
    await bulkUpdateOrders(formData({ orderIds: 'order-1,order-2', status: 'processing' }))

    expect(Orders.bulkUpdateOrderStatus).toHaveBeenCalledWith(['order-1', 'order-2'], 'processing')
  })

  it('returns the caller to the dispatch queue', async () => {
    await bulkUpdateOrders(formData({ orderIds: 'order-1', status: 'processing' }))

    expect(NextNavigation.redirect).toHaveBeenCalledWith('/admin/orders')
  })

  // bulkUpdateOrderStatus throws (not-allowed status, empty selection, over
  // the cap) rather than returning a result object — that error must reach
  // the caller as the same {error} shape as every other validation failure,
  // not as an unhandled rejection.
  it('surfaces a rejection from bulkUpdateOrderStatus as an error result', async () => {
    vi.mocked(Orders.bulkUpdateOrderStatus).mockRejectedValue(new Error('Cannot update more than 50 orders at once'))

    const result = await bulkUpdateOrders(formData({ orderIds: 'order-1', status: 'processing' }))

    expect(result).toEqual({ error: 'Cannot update more than 50 orders at once' })
    expect(NextNavigation.redirect).not.toHaveBeenCalled()
  })
})
