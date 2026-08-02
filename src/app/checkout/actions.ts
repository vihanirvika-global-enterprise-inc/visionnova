'use server'

import { createOrder } from '@/lib/orders'
import { addOrderItem } from '@/lib/orderItems'
import { getSession } from '@/lib/session'
import { validateShippingAddress } from '@/lib/validation'
import { regionForCountry } from '@/lib/region'
import { getProductById } from '@/lib/products'
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
  | { orderId: string; totalAmount: number; priceAdjusted: boolean }
  | { error: string }

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

  const priceAdjusted = resolvedItems.some(
    (item) => Math.abs(item.product!.price - item.assumedPrice) > PRICE_DRIFT_EPSILON
  )

  const totalAmount = resolvedItems.reduce(
    (sum, item) => sum + item.product!.price * item.quantity,
    0
  )

  const order = await createOrder({
    customerId: session.customerId,
    totalAmount,
    shippingAddress: address,
  })

  await Promise.all(
    resolvedItems.map((item) =>
      addOrderItem({
        orderId: order.id,
        productId: item.product!.id,
        quantity: item.quantity,
        unitPrice: item.product!.price,
      })
    )
  )

  return { orderId: order.id, totalAmount, priceAdjusted }
}
