'use server'

import { getSession } from '@/lib/session'
import { addToWishlist, removeFromWishlist } from '@/lib/wishlist'

// The heart toggle lives on ProductCard, which renders on public pages
// (Homepage, Catalog) outside the /account middleware gate — so this is the
// actual auth boundary, not a redundant check.
export async function toggleWishlistAction(
  productId: string,
  shouldAdd: boolean
): Promise<{ error: string } | { ok: true }> {
  const session = getSession()
  if (!session) return { error: 'You must be logged in to use your wishlist' }

  if (shouldAdd) {
    await addToWishlist(session.customerId, productId)
  } else {
    await removeFromWishlist(session.customerId, productId)
  }

  return { ok: true }
}
