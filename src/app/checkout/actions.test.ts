import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Orders from '@/lib/orders'
import * as OrderItems from '@/lib/orderItems'
import * as Session from '@/lib/session'
import * as Products from '@/lib/products'
import * as Prescriptions from '@/lib/prescriptions'
import * as Coupons from '@/lib/coupons'
import { checkoutAction } from './actions'
import type { ShippingAddress, Product, Prescription } from '@/types'

vi.mock('@/lib/orders', () => ({ createOrder: vi.fn() }))
vi.mock('@/lib/orderItems', () => ({ addOrderItem: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/products', () => ({ getProductById: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ getPrescriptionsByCustomer: vi.fn() }))
vi.mock('@/lib/coupons', () => ({ validateCoupon: vi.fn(), incrementCouponUsage: vi.fn() }))

let mockSet: ReturnType<typeof vi.fn>
let mockGet: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

const SESSION_CUSTOMER = 'cust-abc'

const realProduct: Product = {
  id: 'prod-1', name: 'Classic Frame', description: null,
  price: 99.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

const rxProduct: Product = {
  ...realProduct, id: 'prod-rx', requiresPrescription: true,
}

function makePrescription(overrides: Partial<Prescription> = {}): Prescription {
  return {
    id: 'rx-1', customerId: SESSION_CUSTOMER, fileUrl: 'key.pdf', status: 'approved',
    consentGivenAt: new Date(),
    rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null,
    leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null,
    pupillaryDistance: null, expiresAt: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSet = vi.fn()
  mockGet = vi.fn()
  mockDelete = vi.fn()
  vi.spyOn(NextHeaders, 'cookies').mockReturnValue(
    { set: mockSet, get: mockGet, delete: mockDelete } as any
  )
  vi.mocked(Session.getSession).mockReturnValue({ customerId: SESSION_CUSTOMER, role: 'customer' })
  vi.mocked(Products.getProductById).mockImplementation(async (id: string) =>
    id === 'prod-rx' ? rxProduct : realProduct
  )
  vi.mocked(Prescriptions.getPrescriptionsByCustomer).mockResolvedValue([])
  vi.mocked(Orders.createOrder).mockImplementation(async (input: any) => ({
    id: 'order-1', customerId: input.customerId, status: 'pending',
    totalAmount: input.totalAmount, shippingAddress: input.shippingAddress,
    createdAt: new Date(), updatedAt: new Date(),
  }) as any)
  vi.mocked(OrderItems.addOrderItem).mockResolvedValue({} as any)
  vi.mocked(Coupons.validateCoupon).mockResolvedValue({ valid: false, reason: 'not_found' })
  vi.mocked(Coupons.incrementCouponUsage).mockResolvedValue(true)
})

afterEach(() => { vi.restoreAllMocks() })

function makeFormData(
  address: ShippingAddress,
  cartJson: string,
  couponCode?: string
): FormData {
  const fd = new FormData()
  fd.append('fullName', address.fullName ?? '')
  fd.append('email', address.email ?? '')
  fd.append('phone', address.phone ?? '')
  fd.append('line1', address.line1)
  fd.append('line2', address.line2 ?? '')
  fd.append('city', address.city)
  fd.append('state', address.state)
  fd.append('postalCode', address.postalCode)
  fd.append('country', address.country)
  fd.append('cart', cartJson)
  if (couponCode) fd.append('couponCode', couponCode)
  return fd
}

// India-first: the serviceable-region guard rejects anything else, so the
// happy-path fixture has to be an Indian address.
const address: ShippingAddress = {
  fullName: 'Asha Rao', email: 'asha@example.com', phone: '9876543210',
  line1: '123 MG Road', city: 'Bengaluru',
  // State must be a canonical name from INDIAN_STATES, not a code — the
  // checkout form now renders it as a dropdown for exactly this reason.
  state: 'Karnataka', postalCode: '560001', country: 'IN',
}

// The wire format only ever carries productId + quantity as trusted data.
// assumedPrice travels along too, but only to detect drift between what the
// client's cart UI believed and what the server's real price is — it is
// never used to compute the actual total or unit_price.
function cartPayload(items: { productId: string; quantity: number; assumedPrice: number }[]) {
  return JSON.stringify(items)
}

describe('checkoutAction', () => {
  it('returns an error when the address is incomplete', async () => {
    const fd = new FormData()
    fd.append('cart', cartPayload([{ productId: 'prod-1', quantity: 2, assumedPrice: 99.99 }]))

    const result = await checkoutAction(fd)

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.createOrder).not.toHaveBeenCalled()
  })

  it('returns an error when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 2, assumedPrice: 99.99 }]))
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.createOrder).not.toHaveBeenCalled()
  })

  // Blocking only at the payment step would leave orphaned pending orders for
  // customers we cannot serve.
  it('refuses a non-Indian shipping address before creating an order', async () => {
    const result = await checkoutAction(
      makeFormData(
        { ...address, country: 'US' },
        cartPayload([{ productId: 'prod-1', quantity: 2, assumedPrice: 99.99 }])
      )
    )

    expect(result).toEqual({ error: expect.stringMatching(/india/i) })
    expect(Orders.createOrder).not.toHaveBeenCalled()
    expect(OrderItems.addOrderItem).not.toHaveBeenCalled()
  })

  it('creates an order priced from the server-fetched product, not the client payload', async () => {
    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 2, assumedPrice: 99.99 }]))
    )

    expect(Products.getProductById).toHaveBeenCalledWith('prod-1')
    expect(Orders.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      customerId: SESSION_CUSTOMER,
      shippingAddress: address,
      totalAmount: 199.98, // 99.99 * 2, from the server-fetched price
    }))
    expect(OrderItems.addOrderItem).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-1',
      productId: 'prod-1',
      quantity: 2,
      unitPrice: 99.99, // server-fetched, not client-supplied
    }))
    expect(result).toEqual({ orderId: 'order-1', totalAmount: 199.98, priceAdjusted: false, discount: 0 })
  })

  // These four fields were collected by the form and then dropped before the
  // request was built, so an order was created with no name and no contact
  // number for the courier — and the Phone field accepted a door number
  // because nothing downstream ever looked at it.
  it('persists the contact fields the form collects', async () => {
    await checkoutAction(
      makeFormData(
        { ...address, line2: 'Flat 4B' },
        cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }])
      )
    )

    expect(Orders.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      shippingAddress: expect.objectContaining({
        fullName: 'Asha Rao',
        email: 'asha@example.com',
        phone: '9876543210',
        line2: 'Flat 4B',
      }),
    }))
  })

  // Stored in the canonical 10-digit form regardless of how it was typed, so
  // downstream consumers (courier handoff, SMS) never have to re-parse it.
  it('stores the phone number normalised', async () => {
    await checkoutAction(
      makeFormData(
        { ...address, phone: '+91 98765 43210' },
        cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }])
      )
    )

    expect(Orders.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      shippingAddress: expect.objectContaining({ phone: '9876543210' }),
    }))
  })

  it('rejects free-text address content in the phone field', async () => {
    const result = await checkoutAction(
      makeFormData(
        { ...address, phone: '22-1-53 A Balaji nagar' },
        cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }])
      )
    )

    expect(result).toEqual({ error: 'Enter a valid 10-digit Indian mobile number' })
    expect(Orders.createOrder).not.toHaveBeenCalled()
  })

  // The actual attack: a tampered client payload claims a fabricated low price.
  // The real price (99.99) must be what's actually charged, never the
  // attacker's claimed price (0.01).
  it('ignores a tampered client price and charges the real server-fetched price', async () => {
    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 0.01 }]))
    )

    expect(Orders.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 99.99 })
    )
    expect(OrderItems.addOrderItem).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 99.99 })
    )
    expect(result).toEqual({ orderId: 'order-1', totalAmount: 99.99, priceAdjusted: true, discount: 0 })
  })

  // Legitimate case: the price genuinely changed between add-to-cart and
  // checkout. Same mechanism as the tamper case (server price always wins),
  // but this proves the "signal, don't silently charge a different number"
  // requirement: priceAdjusted is surfaced so the client can tell the user.
  it('surfaces priceAdjusted when the real price differs from what the cart assumed, without blocking checkout', async () => {
    vi.mocked(Products.getProductById).mockResolvedValue({ ...realProduct, price: 129.99 })

    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }]))
    )

    expect(result).toEqual({ orderId: 'order-1', totalAmount: 129.99, priceAdjusted: true, discount: 0 })
    expect(OrderItems.addOrderItem).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 129.99 })
    )
  })

  it('rejects checkout when a cart item references a product that no longer exists', async () => {
    vi.mocked(Products.getProductById).mockResolvedValue(null)

    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-deleted', quantity: 1, assumedPrice: 49.99 }]))
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.createOrder).not.toHaveBeenCalled()
    expect(OrderItems.addOrderItem).not.toHaveBeenCalled()
  })

  it('returns an error rather than proceeding when the cart is empty', async () => {
    const result = await checkoutAction(makeFormData(address, cartPayload([])))

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.createOrder).not.toHaveBeenCalled()
  })

  // The payment step needs the orderId in hand, so checkout must not redirect away
  // before the caller can read it.
  it('does not redirect — the caller drives the transition to payment', async () => {
    await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 2, assumedPrice: 99.99 }]))
    )

    expect(NextNavigation.redirect).not.toHaveBeenCalled()
  })

  it('leaves status to the schema default so the order starts pre-payment', async () => {
    await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 2, assumedPrice: 99.99 }]))
    )

    expect(Orders.createOrder).toHaveBeenCalledWith(
      expect.not.objectContaining({ status: expect.anything() })
    )
  })
})

describe('checkoutAction — prescription-confirmation gate', () => {
  it('rejects checkout for a prescription-required item when the customer has no prescription on file at all', async () => {
    vi.mocked(Prescriptions.getPrescriptionsByCustomer).mockResolvedValue([])

    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-rx', quantity: 1, assumedPrice: 99.99 }]))
    )

    expect(result).toEqual({ error: expect.any(String), requiresPrescriptionUpload: true })
    expect(Orders.createOrder).not.toHaveBeenCalled()
    expect(OrderItems.addOrderItem).not.toHaveBeenCalled()
  })

  it.each(['pending', 'rejected'] as const)(
    'rejects checkout for a prescription-required item when the only prescription on file is %s, not approved',
    async (status) => {
      vi.mocked(Prescriptions.getPrescriptionsByCustomer).mockResolvedValue([
        makePrescription({ status }),
      ])

      const result = await checkoutAction(
        makeFormData(address, cartPayload([{ productId: 'prod-rx', quantity: 1, assumedPrice: 99.99 }]))
      )

      expect(result).toEqual({ error: expect.any(String), requiresPrescriptionUpload: true })
      expect(Orders.createOrder).not.toHaveBeenCalled()
    }
  )

  it('proceeds and populates order_items.prescriptionId when an approved prescription exists', async () => {
    const approved = makePrescription({ id: 'rx-approved', status: 'approved' })
    vi.mocked(Prescriptions.getPrescriptionsByCustomer).mockResolvedValue([approved])

    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-rx', quantity: 1, assumedPrice: 99.99 }]))
    )

    expect('error' in result).toBe(false)
    expect(OrderItems.addOrderItem).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'prod-rx', prescriptionId: 'rx-approved' })
    )
  })

  // ST-010: this is what CheckoutForm reads to decide whether the Confirm
  // Prescription step belongs in this checkout at all.
  it('returns the approved prescription id in the success result', async () => {
    const approved = makePrescription({ id: 'rx-approved', status: 'approved' })
    vi.mocked(Prescriptions.getPrescriptionsByCustomer).mockResolvedValue([approved])

    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-rx', quantity: 1, assumedPrice: 99.99 }]))
    )

    expect(result).toEqual(expect.objectContaining({ prescriptionId: 'rx-approved' }))
  })

  it('leaves prescriptionId undefined when the cart has no Rx-required items', async () => {
    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }]))
    )

    expect((result as { prescriptionId?: string }).prescriptionId).toBeUndefined()
  })

  it('rejects the entire checkout for a mixed cart — one Rx item without approval, one non-Rx item — not just the Rx item', async () => {
    vi.mocked(Prescriptions.getPrescriptionsByCustomer).mockResolvedValue([])

    const result = await checkoutAction(
      makeFormData(address, cartPayload([
        { productId: 'prod-rx', quantity: 1, assumedPrice: 99.99 },
        { productId: 'prod-1', quantity: 1, assumedPrice: 99.99 },
      ]))
    )

    expect(result).toEqual({ error: expect.any(String), requiresPrescriptionUpload: true })
    expect(Orders.createOrder).not.toHaveBeenCalled()
    expect(OrderItems.addOrderItem).not.toHaveBeenCalled()
  })

  it('does not check prescriptions at all when the cart has no Rx-required items', async () => {
    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }]))
    )

    expect('error' in result).toBe(false)
    expect(Prescriptions.getPrescriptionsByCustomer).not.toHaveBeenCalled()
  })
})

describe('checkoutAction — stock re-validation', () => {
  // Same principle as the pricing fix: never trust the client cart's
  // quantity against stock any more than its price. Stock is re-fetched here
  // and, unlike a price drift, a shortfall blocks checkout entirely rather
  // than silently adjusting the quantity — there is no "close enough" when
  // what's actually available is physically less than what was requested.
  it('rejects checkout when requested quantity exceeds current stock', async () => {
    vi.mocked(Products.getProductById).mockResolvedValue({ ...realProduct, stockQuantity: 2 })

    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 5, assumedPrice: 99.99 }]))
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.createOrder).not.toHaveBeenCalled()
    expect(OrderItems.addOrderItem).not.toHaveBeenCalled()
  })

  it('proceeds when the requested quantity exactly matches available stock', async () => {
    vi.mocked(Products.getProductById).mockResolvedValue({ ...realProduct, stockQuantity: 2 })

    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 2, assumedPrice: 99.99 }]))
    )

    expect('error' in result).toBe(false)
    expect(Orders.createOrder).toHaveBeenCalled()
  })

  it('rejects the entire checkout for a mixed cart — one item with enough stock, one without — not just the short item', async () => {
    vi.mocked(Products.getProductById).mockImplementation(async (id: string) => {
      if (id === 'prod-1') return { ...realProduct, id: 'prod-1', stockQuantity: 5 }
      if (id === 'prod-2') return { ...realProduct, id: 'prod-2', stockQuantity: 0 }
      return null
    })

    const result = await checkoutAction(
      makeFormData(address, cartPayload([
        { productId: 'prod-1', quantity: 1, assumedPrice: 99.99 },
        { productId: 'prod-2', quantity: 1, assumedPrice: 99.99 },
      ]))
    )

    expect(result).toEqual({ error: expect.any(String) })
    expect(Orders.createOrder).not.toHaveBeenCalled()
    expect(OrderItems.addOrderItem).not.toHaveBeenCalled()
  })

  // Normal case: stock is adequate throughout, so this check must never
  // interfere with an ordinary checkout.
  it('does not block checkout when stock is adequate for every item', async () => {
    const result = await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 2, assumedPrice: 99.99 }]))
    )

    expect('error' in result).toBe(false)
    expect(Orders.createOrder).toHaveBeenCalled()
  })
})

describe('checkoutAction — coupon re-validation', () => {
  it('does not touch coupon logic at all when no code is submitted', async () => {
    await checkoutAction(
      makeFormData(address, cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }]))
    )

    expect(Coupons.validateCoupon).not.toHaveBeenCalled()
    expect(Coupons.incrementCouponUsage).not.toHaveBeenCalled()
  })

  it('applies the discount and increments usage for a valid coupon', async () => {
    vi.mocked(Coupons.validateCoupon).mockResolvedValue({
      valid: true,
      coupon: {
        id: 'coupon-1', code: 'SAVE10', type: 'percent', value: 10,
        validFrom: new Date(), validTo: new Date(),
        maxUses: 100, currentUses: 5, createdAt: new Date(),
      },
      discount: 9.999, // 10% of 99.99
    })

    const result = await checkoutAction(
      makeFormData(
        address,
        cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }]),
        'SAVE10'
      )
    )

    expect(Coupons.validateCoupon).toHaveBeenCalledWith('SAVE10', 99.99)
    expect(Coupons.incrementCouponUsage).toHaveBeenCalledWith('coupon-1')
    expect(Orders.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 89.991 }) // 99.99 - 9.999
    )
    expect(result).toEqual(expect.objectContaining({
      orderId: 'order-1', totalAmount: 89.991, discount: 9.999,
    }))
  })

  it.each([
    ['not_found', 'nonexistent code'],
    ['not_yet_valid', 'a code not yet active'],
    ['expired', 'an expired code'],
    ['usage_limit_reached', 'a maxed-out code'],
  ] as const)(
    'proceeds without a discount and surfaces the %s reason for %s, rather than blocking checkout',
    async (reason, _description) => {
      vi.mocked(Coupons.validateCoupon).mockResolvedValue({ valid: false, reason })

      const result = await checkoutAction(
        makeFormData(
          address,
          cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }]),
          'SOMECODE'
        )
      )

      expect(Coupons.incrementCouponUsage).not.toHaveBeenCalled()
      expect(Orders.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 99.99 })
      )
      expect(result).toEqual(expect.objectContaining({
        orderId: 'order-1', totalAmount: 99.99, discount: 0, couponRejectionReason: reason,
      }))
    }
  )

  // The real re-validation case: the client's cart applied a coupon that
  // looked valid at the time, but by checkout it's no longer valid (someone
  // else used the last slot in between). checkoutAction must not honor
  // stale client state — it only ever trusts the coupon CODE string, never
  // a "this was valid" flag, and re-validates against the DB independently.
  it('does not honor a coupon that became invalid between cart-apply and checkout', async () => {
    vi.mocked(Coupons.validateCoupon).mockResolvedValue({
      valid: false, reason: 'usage_limit_reached',
    })

    const result = await checkoutAction(
      makeFormData(
        address,
        cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }]),
        'SAVE10'
      )
    )

    expect(result).toEqual(expect.objectContaining({
      totalAmount: 99.99, discount: 0, couponRejectionReason: 'usage_limit_reached',
    }))
  })

  // The race itself: validateCoupon's read says valid (it was, a moment
  // ago), but the atomic increment loses the race against a concurrent
  // checkout and returns false. The order must still be created at the
  // undiscounted price — the increment result, not the earlier read, is
  // what actually governs whether the discount applies.
  it('does not apply the discount when the atomic usage increment loses the race', async () => {
    vi.mocked(Coupons.validateCoupon).mockResolvedValue({
      valid: true,
      coupon: {
        id: 'coupon-1', code: 'SAVE10', type: 'percent', value: 10,
        validFrom: new Date(), validTo: new Date(),
        maxUses: 1, currentUses: 1, createdAt: new Date(),
      },
      discount: 9.999,
    })
    vi.mocked(Coupons.incrementCouponUsage).mockResolvedValue(false)

    const result = await checkoutAction(
      makeFormData(
        address,
        cartPayload([{ productId: 'prod-1', quantity: 1, assumedPrice: 99.99 }]),
        'SAVE10'
      )
    )

    expect(Orders.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 99.99 })
    )
    expect(result).toEqual(expect.objectContaining({
      totalAmount: 99.99, discount: 0, couponRejectionReason: 'usage_limit_reached',
    }))
  })
})
