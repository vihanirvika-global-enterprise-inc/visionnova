'use client'

import { useCart } from '@/components/cart/CartContext'

export default function CheckoutPage() {
  const { total } = useCart()

  return (
    <main>
      <p>Total: ${total.toFixed(2)}</p>
      <button type="button">Place Order</button>
    </main>
  )
}
