import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getWishlist } from '@/lib/wishlist'
import { ProductGrid } from '@/components/ui/ProductGrid'
import { WishlistEmptyState } from '@/components/wishlist/WishlistEmptyState'

// ST-015 / TK-029 (A15. Wishlist — build UI): the listing screen. The toggle
// itself lives on ProductCard (src/components/ui/WishlistButton.tsx), not
// here — this route only renders what's already been saved.
export default async function WishlistPage() {
  const session = getSession()

  if (!session) {
    redirect('/login')
  }

  const products = await getWishlist(session.customerId)

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-dark">My Wishlist</h1>
          <p className="mt-2 text-muted">
            {products.length === 1 ? '1 item saved' : `${products.length} items saved`}
          </p>
        </div>
        <Link href="/account" className="text-sm font-medium text-primary hover:text-teal">
          ← Back to Account
        </Link>
      </div>

      {products.length === 0 ? (
        <WishlistEmptyState />
      ) : (
        <ProductGrid products={products} />
      )}
    </main>
  )
}
