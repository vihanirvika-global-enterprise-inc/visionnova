import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getWishlist } from '@/lib/wishlist'
import { ProductGrid } from '@/components/ui/ProductGrid'

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
          <p className="mt-2 text-muted">Products you&apos;ve saved for later</p>
        </div>
        <Link href="/account" className="text-sm font-medium text-primary hover:text-teal">
          ← Back to Account
        </Link>
      </div>

      <ProductGrid products={products} />
    </main>
  )
}
