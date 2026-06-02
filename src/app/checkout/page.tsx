'use client'

import { useCart } from '@/components/cart/CartContext'

export default function CheckoutPage() {
  const { total } = useCart()

  return (
    <main>
      <form>
        <label htmlFor="line1">Street Address</label>
        <input id="line1" type="text" name="line1" />

        <label htmlFor="city">City</label>
        <input id="city" type="text" name="city" />

        <label htmlFor="postalCode">Postal Code</label>
        <input id="postalCode" type="text" name="postalCode" />

        <label htmlFor="state">State</label>
        <input id="state" type="text" name="state" />

        <label htmlFor="country">Country</label>
        <input id="country" type="text" name="country" defaultValue="US" />
      </form>
      <p>Total: ${total.toFixed(2)}</p>
      <button type="button">Place Order</button>
    </main>
  )
}
