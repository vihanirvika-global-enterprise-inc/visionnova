import type { Metadata } from 'next'
import { getInStockProducts } from '@/lib/products'
import { ProductGrid } from '@/components/ui/ProductGrid'

export const metadata: Metadata = {
  title: 'Eyeglasses',
  description: 'Shop premium prescription eyewear from ₹799. Verified by licensed optometrists with free delivery across India.',
}

export default async function CatalogPage() {
  const products = await getInStockProducts()

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-dark">Eyeglasses</h1>
        <p className="mt-2 text-muted">
          Browse our full collection — prescription and non-prescription
        </p>
      </div>
      <ProductGrid products={products} />
    </main>
  )
}
