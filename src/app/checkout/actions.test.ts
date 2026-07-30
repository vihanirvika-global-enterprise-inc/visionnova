import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Orders from '@/lib/orders'
import * as OrderItems from '@/lib/orderItems'
import * as Session from '@/lib/session'
import { checkoutAction } from './actions'
import type { ShippingAddress } from '@/types'

vi.mock('@/lib/orders', () => ({ createOrder: vi.fn() }))
vi.mock('@/lib/orderItems', () => ({ addOrderItem: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))

let mockSet: ReturnType<typeof vi.fn>
let mockGet: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

const SESSION_CUSTOMER = 'cust-abc'

beforeEach(() => {
  mockSet = vi.fn()
  mockGet = vi.fn()
  mockDelete = vi.fn()
  vi.spyOn(NextHeaders, 'cookies').mockReturnValue(
    { set: mockSet, get: mockGet, delete: mockDelete } as any
  )
  vi.mocked(Session.getSession).mockReturnValue({ customerId: SESSION_CUSTOMER })
})

afterEach(() => { vi.restoreAllMocks() })

function makeFormData(address: ShippingAddress, cartJson: string): FormData {
  const fd = new FormData()
  fd.append('line1', address.line1)
  fd.append('city', address.city)
  fd.append('state', address.state)
  fd.append('postalCode', address.postalCode)
  fd.append('country', address.country)
  fd.append('cart', cartJson)
  return fd
}

const address: ShippingAddress = {
  line1: '123 Main St', city: 'Springfield',
  state: 'IL', postalCode: '62701', country: 'US',
}

const cartItems = [
  { product: { id: 'prod-1', price: 99.99 }, quantity: 2 },
]

describe('checkoutAction', () => {
  it('returns an error when the address is incomplete', async () => {
    const fd = new FormData()
    fd.append('cart', JSON.stringify(cartItems))

    const result = await checkoutAction(fd)

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.createOrder).not.toHaveBeenCalled()
  })

  it('returns an error when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    const result = await checkoutAction(makeFormData(address, JSON.stringify(cartItems)))

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.createOrder).not.toHaveBeenCalled()
  })

  it('creates an order with items and returns its orderId', async () => {
    const mockOrder = {
      id: 'order-1', customerId: SESSION_CUSTOMER, status: 'pending',
      totalAmount: 199.98, shippingAddress: address,
      createdAt: new Date(), updatedAt: new Date(),
    }
    vi.mocked(Orders.createOrder).mockResolvedValue(mockOrder as any)
    vi.mocked(OrderItems.addOrderItem).mockResolvedValue({} as any)

    const result = await checkoutAction(makeFormData(address, JSON.stringify(cartItems)))

    expect(Orders.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      customerId: SESSION_CUSTOMER,
      shippingAddress: address,
    }))
    expect(OrderItems.addOrderItem).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-1',
      productId: 'prod-1',
      quantity: 2,
      unitPrice: 99.99,
    }))
    expect(result).toEqual({ orderId: 'order-1' })
  })

  // The payment step needs the orderId in hand, so checkout must not redirect away
  // before the caller can read it.
  it('does not redirect — the caller drives the transition to payment', async () => {
    vi.mocked(Orders.createOrder).mockResolvedValue({ id: 'order-1' } as any)
    vi.mocked(OrderItems.addOrderItem).mockResolvedValue({} as any)

    await checkoutAction(makeFormData(address, JSON.stringify(cartItems)))

    expect(NextNavigation.redirect).not.toHaveBeenCalled()
  })

  it('leaves status to the schema default so the order starts pre-payment', async () => {
    vi.mocked(Orders.createOrder).mockResolvedValue({ id: 'order-1' } as any)
    vi.mocked(OrderItems.addOrderItem).mockResolvedValue({} as any)

    await checkoutAction(makeFormData(address, JSON.stringify(cartItems)))

    expect(Orders.createOrder).toHaveBeenCalledWith(
      expect.not.objectContaining({ status: expect.anything() })
    )
  })
})
