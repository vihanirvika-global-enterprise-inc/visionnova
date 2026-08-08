'use client'

import { useRouter } from 'next/navigation'
import { useWishlist } from '@/components/wishlist/WishlistContext'
import type { Product } from '@/types'

interface WishlistButtonProps {
  product: Product
  // 'card' pins it to the image corner, which is what every catalogue grid
  // wants and stays the default so existing callers are untouched. 'inline'
  // puts it in normal flow for the PDP, where an absolutely-positioned heart
  // would float over the gallery.
  placement?: 'card' | 'inline'
}

export function WishlistButton({ product, placement = 'card' }: WishlistButtonProps) {
  const { isLoggedIn, isWishlisted, toggleWishlist } = useWishlist()
  const router = useRouter()
  const wishlisted = isWishlisted(product.id)

  function handleClick() {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }
    toggleWishlist(product.id)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      className={
        placement === 'inline'
          ? 'flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-dark transition hover:bg-surface'
          : 'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-dark shadow-sm transition hover:bg-white'
      }
    >
      <svg
        aria-hidden="true"
        className={wishlisted ? 'h-5 w-5 text-primary' : 'h-5 w-5 text-slate-400'}
        fill={wishlisted ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>

      {/* The card variant stays icon-only — a grid of hearts is legible, and
          the aria-label carries the meaning. Inline, a lone heart in a column
          of full-width controls reads as decoration. */}
      {placement === 'inline' && (
        <span>{wishlisted ? 'Saved to wishlist' : 'Save to wishlist'}</span>
      )}
    </button>
  )
}
