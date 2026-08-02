'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'
import { logoutAction } from '@/app/actions/logout'
import { MobileBottomNav } from './MobileBottomNav'

interface NavbarProps {
  isLoggedIn?: boolean
}

export function Navbar({ isLoggedIn = false }: NavbarProps) {
  const { items } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
    <nav aria-label="main navigation" className="sticky top-0 z-50 w-full bg-dark shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Wordmark */}
        {/* No aria-label: the visible text is the accessible name. An
            aria-label of "Home" here breaks WCAG 2.5.3 Label in Name, leaving
            voice-control users unable to say what they can read. */}
        <Link
          href="/"
          className="text-xl font-bold text-white hover:text-slate-200"
        >
          VisionNova
        </Link>

        {/* Center nav — desktop only */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="/shop" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Shop</Link>
          <Link href="/about" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">About</Link>
          <Link href="/help" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Help</Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">

          {/* Cart icon with badge */}
          <Link
            href="/cart"
            aria-label={itemCount > 0 ? `Cart (${itemCount})` : 'Cart'}
            className="relative p-1 text-white transition-colors hover:text-slate-300"
          >
            <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Auth state — desktop only */}
          <div className="hidden items-center gap-3 md:flex">
            {isLoggedIn ? (
              <>
                <Link
                  href="/account"
                  className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                >
                  My Account
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                  >
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/account"
                  className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                >
                  Account
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-white/40 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="p-1 text-white transition-colors hover:text-slate-300 focus:outline-none md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown — only mounted when open, so tests never see duplicate links */}
      {mobileOpen && (
        <div className="border-t border-slate-700 bg-dark px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/shop" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Shop</Link>
            <Link href="/about" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">About</Link>
            <Link href="/help" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Help</Link>
            <div className="flex flex-col gap-3 border-t border-slate-700 pt-3">
              {isLoggedIn ? (
                <>
                  <Link href="/account" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">My Account</Link>
                  <form action={logoutAction}>
                    <button type="submit" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Sign Out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/account" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Account</Link>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">Sign In</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
    <MobileBottomNav isLoggedIn={isLoggedIn} />
    </>
  )
}
