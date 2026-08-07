'use server'

import { revalidatePath } from 'next/cache'
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

  // The listing at /account/wishlist is a server render of getWishlist(), so
  // without this an item unhearted from that page keeps its card and its place
  // in the saved count until a manual reload.
  revalidatePath('/account/wishlist')

  return { ok: true }
}
