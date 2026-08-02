'use client'

import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'

interface MobileBottomNavProps {
  isLoggedIn?: boolean
}

export function MobileBottomNav({ isLoggedIn = false }: MobileBottomNavProps) {
  const { items } = useCart()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <nav
      aria-label="mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-slate-700 bg-dark md:hidden"
    >
      <Link href="/" className="flex flex-col items-center gap-0.5 text-xs text-slate-300 hover:text-white">
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        Home
      </Link>

      <Link href="/shop" className="flex flex-col items-center gap-0.5 text-xs text-slate-300 hover:text-white">
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 2.25H7.5a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25V4.5a2.25 2.25 0 00-2.25-2.25H15M9 2.25v6.75a1.5 1.5 0 001.5 1.5h3a1.5 1.5 0 001.5-1.5V2.25M9 2.25h6" />
        </svg>
        Shop
      </Link>

      <Link
        href="/cart"
        aria-label={itemCount > 0 ? `Cart (${itemCount})` : 'Cart'}
        className="relative flex flex-col items-center gap-0.5 text-xs text-slate-300 hover:text-white"
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
        Cart
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-white">
            {itemCount}
          </span>
        )}
      </Link>

      {isLoggedIn ? (
        <Link href="/account" className="flex flex-col items-center gap-0.5 text-xs text-slate-300 hover:text-white">
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Account
        </Link>
      ) : (
        <Link href="/login" className="flex flex-col items-center gap-0.5 text-xs text-slate-300 hover:text-white">
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" />
          </svg>
          Sign In
        </Link>
      )}
    </nav>
  )
}
