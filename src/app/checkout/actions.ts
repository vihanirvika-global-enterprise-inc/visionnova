'use server'

import { createOrder } from '@/lib/orders'
import { addOrderItem } from '@/lib/orderItems'
import { getSession } from '@/lib/session'
import { validateShippingAddress } from '@/lib/validation'
import { regionForCountry } from '@/lib/region'
import {
  isServiceableRegion,
  UNSERVICEABLE_REGION_MESSAGE,
} from '@/lib/serviceableRegions'

interface CartItem {
  product: { id: string; price: number }
  quantity: number
}

export type CheckoutResult = { orderId: string } | { error: string }

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
  const items: CartItem[] = cartJson ? JSON.parse(cartJson) : []

  const totalAmount = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  const order = await createOrder({
    customerId: session.customerId,
    totalAmount,
    shippingAddress: address,
  })

  await Promise.all(
    items.map((item) =>
      addOrderItem({
        orderId: order.id,
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
      })
    )
  )

  return { orderId: order.id }
}
