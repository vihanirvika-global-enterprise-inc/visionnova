'use client'

import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'
import { logoutAction } from '@/app/actions/logout'

interface NavbarProps {
  isLoggedIn?: boolean
}

export function Navbar({ isLoggedIn = false }: NavbarProps) {
  const { items } = useCart()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/shop">Shop</Link>
      <Link href="/cart">Cart {itemCount > 0 && `(${itemCount})`}</Link>
      <Link href="/account">Account</Link>
      {isLoggedIn ? (
        <form action={logoutAction}>
          <button type="submit">Logout</button>
        </form>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </nav>
  )
}
