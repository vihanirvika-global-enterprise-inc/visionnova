'use client'

import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'

export function Navbar() {
  const { items } = useCart()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/cart">Cart {itemCount > 0 && `(${itemCount})`}</Link>
      <Link href="/account">Account</Link>
    </nav>
  )
}
