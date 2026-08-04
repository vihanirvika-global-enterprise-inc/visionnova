'use client'

import { createContext, useContext, useState } from 'react'
import { toggleWishlistAction } from '@/app/account/wishlist/actions'

interface WishlistContextValue {
  isLoggedIn: boolean
  isWishlisted: (productId: string) => boolean
  toggleWishlist: (productId: string) => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

interface WishlistProviderProps {
  children: React.ReactNode
  initialWishlistedIds: string[]
  isLoggedIn: boolean
}

export function WishlistProvider({ children, initialWishlistedIds, isLoggedIn }: WishlistProviderProps) {
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set(initialWishlistedIds))

  function isWishlisted(productId: string): boolean {
    return wishlistedIds.has(productId)
  }

  // Optimistic: flip locally first, then persist. The heart on ProductCard
  // must never claim a state the server didn't actually save, so a failed
  // toggle (e.g. the session expired between render and click) reverts it.
  function toggleWishlist(productId: string) {
    const shouldAdd = !wishlistedIds.has(productId)

    setWishlistedIds((prev) => {
      const next = new Set(prev)
      if (shouldAdd) next.add(productId)
      else next.delete(productId)
      return next
    })

    toggleWishlistAction(productId, shouldAdd).then((result) => {
      if ('error' in result) {
        setWishlistedIds((prev) => {
          const next = new Set(prev)
          if (shouldAdd) next.delete(productId)
          else next.add(productId)
          return next
        })
      }
    })
  }

  return (
    <WishlistContext.Provider value={{ isLoggedIn, isWishlisted, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider')
  return context
}
