'use client'

import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'

export default function CartPage() {
  const { items, total, removeFromCart } = useCart()

  if (items.length === 0) {
    return <main><p>Your cart is empty</p></main>
  }

  return (
    <main>
      <ul>
        {items.map((item) => (
          <li key={item.product.id}>
            {item.product.name} × {item.quantity}
            <button onClick={() => removeFromCart(item.product.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <p>Total: ${total.toFixed(2)}</p>
      <Link href="/checkout">Proceed to Checkout</Link>
    </main>
  )
}
