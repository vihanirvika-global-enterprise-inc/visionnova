'use server'

import { createOrder } from '@/lib/orders'
import { addOrderItem } from '@/lib/orderItems'
import { getSession } from '@/lib/session'
import { validateShippingAddress } from '@/lib/validation'
import { regionForCountry } from '@/lib/region'
import { getProductById } from '@/lib/products'
import { getPrescriptionsByCustomer } from '@/lib/prescriptions'
import { validateCoupon, incrementCouponUsage } from '@/lib/coupons'
import type { CouponRejectionReason } from '@/lib/coupons'
import {
  isServiceableRegion,
  UNSERVICEABLE_REGION_MESSAGE,
} from '@/lib/serviceableRegions'

interface CartItemInput {
  productId: string
  quantity: number
  // The price the client's cart UI believed this item cost. Never used to
  // compute the order total or unit_price — only compared against the real,
  // server-fetched price to detect drift (a genuine price change since the
  // item was added to cart, or a tampered payload), so the caller can be
  // told the total was adjusted instead of silently charging a different
  // number with no signal at all.
  assumedPrice: number
}

export type CheckoutResult =
  | {
      orderId: string
      totalAmount: number
      priceAdjusted: boolean
      discount: number
      couponRejectionReason?: CouponRejectionReason
      // ST-010: present only when an Rx-required item was in the cart — this
      // is what CheckoutForm uses to decide whether the Confirm Prescription
      // step is part of this checkout at all.
      prescriptionId?: string
    }
  | { error: string; requiresPrescriptionUpload?: boolean }

const PRICE_DRIFT_EPSILON = 0.01

export async function checkoutAction(formData: FormData): Promise<CheckoutResult> {
  const session = getSession()
  if (!session) return { error: 'You must be logged in to checkout' }

  const address = {
    line1: (formData.get('line1') as string) ?? '',
    city: (formData.get('city') as string) ?? '',
    state: (formData.get('state') as string) ?? '',
    postalCode: (formData.get('postalCode') as string) ?? '',
    country: (formData.get('country') as string) ?? '',
  }

  const { valid, errors } = validateShippingAddress(address)
  if (!valid) return { error: errors[0] }

  // Refuse before the order row exists, so an unserviceable customer does not
  // leave an orphaned pending order behind.
  if (!isServiceableRegion(regionForCountry(address.country))) {
    return { error: UNSERVICEABLE_REGION_MESSAGE }
  }

  const cartJson = formData.get('cart') as string
  const clientItems: CartItemInput[] = cartJson ? JSON.parse(cartJson) : []

  if (clientItems.length === 0) {
    return { error: 'Your cart is empty' }
  }

  // Only productId + quantity are ever trusted from the client. Price is
  // always re-fetched here, from the database — never taken from the
  // submitted cart payload, which a user can edit arbitrarily in the browser.
  const resolvedItems = await Promise.all(
    clientItems.map(async (item) => ({
      ...item,
      product: await getProductById(item.productId),
    }))
  )

  const unavailable = resolvedItems.some((item) => item.product === null)
  if (unavailable) {
    return {
      error: 'One or more items in your cart are no longer available. Please remove them and try again.',
    }
  }

  // Stock, like price, is client-supplied state that can drift or be
  // tampered with between add-to-cart and checkout. Unlike a price
  // difference, a stock shortfall can't be silently reconciled — there's no
  // "close enough" when the physical quantity available is less than what
  // was requested — so this rejects the whole checkout rather than
  // partially processing or auto-capping the quantity, same all-or-nothing
  // shape as the prescription gate below.
  const insufficientStock = resolvedItems.some(
    (item) => item.quantity > item.product!.stockQuantity
  )
  if (insufficientStock) {
    return {
      error: 'One or more items in your cart no longer have enough stock available. Please update the quantity and try again.',
    }
  }

  // MVP bar: "does this customer have at least one approved prescription on
  // file" — not a per-product match. There is no product-to-prescription
  // linkage anywhere in the schema today, so a stricter per-item check isn't
  // supported by the current data model. Reject the whole checkout rather
  // than partially process if any Rx-required item lacks coverage.
  const requiresPrescription = resolvedItems.some((item) => item.product!.requiresPrescription)
  let approvedPrescription = null as Awaited<ReturnType<typeof getPrescriptionsByCustomer>>[number] | null
  if (requiresPrescription) {
    const prescriptions = await getPrescriptionsByCustomer(session.customerId)
    approvedPrescription = prescriptions.find((p) => p.status === 'approved') ?? null

    if (!approvedPrescription) {
      return {
        error:
          'One or more items require an approved prescription. Please upload and complete prescription review before checkout.',
        requiresPrescriptionUpload: true,
      }
    }
  }

  const priceAdjusted = resolvedItems.some(
    (item) => Math.abs(item.product!.price - item.assumedPrice) > PRICE_DRIFT_EPSILON
  )

  const totalAmount = resolvedItems.reduce(
    (sum, item) => sum + item.product!.price * item.quantity,
    0
  )

  // The client only ever sends the coupon CODE — never a "this was valid"
  // flag. Re-validate against the DB independently; a coupon that looked
  // valid when the cart applied it may no longer be by checkout time.
  const couponCode = (formData.get('couponCode') as string) || null
  let discount = 0
  let couponRejectionReason: CouponRejectionReason | undefined

  if (couponCode) {
    const validation = await validateCoupon(couponCode, totalAmount)
    if (!validation.valid) {
      couponRejectionReason = validation.reason
    } else {
      // Reserve the usage slot atomically BEFORE creating the order, so the
      // order is only ever created with a total reflecting whether the
      // reservation actually succeeded — never the other way around. This
      // is also what actually closes the race between two near-simultaneous
      // checkouts against the same coupon: the earlier read above can say
      // "valid" for both, but only one atomic increment can succeed.
      const reserved = await incrementCouponUsage(validation.coupon.id)
      if (reserved) {
        discount = validation.discount
      } else {
        couponRejectionReason = 'usage_limit_reached'
      }
    }
  }

  const finalTotal = Math.max(0, totalAmount - discount)

  const order = await createOrder({
    customerId: session.customerId,
    totalAmount: finalTotal,
    shippingAddress: address,
  })

  await Promise.all(
    resolvedItems.map((item) =>
      addOrderItem({
        orderId: order.id,
        productId: item.product!.id,
        quantity: item.quantity,
        unitPrice: item.product!.price,
        prescriptionId: item.product!.requiresPrescription
          ? approvedPrescription!.id
          : undefined,
      })
    )
  )

  return {
    orderId: order.id,
    totalAmount: finalTotal,
    priceAdjusted,
    discount,
    couponRejectionReason,
    prescriptionId: approvedPrescription?.id,
  }
}
