import { getSession } from '@/lib/session'
import { getWishlistedProductIds } from '@/lib/wishlist'
import { WishlistProvider } from './WishlistContext'

export async function WishlistProviderServer({ children }: { children: React.ReactNode }) {
  const session = getSession()
  const wishlistedIds = session ? await getWishlistedProductIds(session.customerId) : []

  return (
    <WishlistProvider initialWishlistedIds={wishlistedIds} isLoggedIn={!!session}>
      {children}
    </WishlistProvider>
  )
}
