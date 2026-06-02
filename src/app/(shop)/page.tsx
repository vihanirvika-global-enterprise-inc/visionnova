import { getProducts } from '@/lib/products'
import { ProductGrid } from '@/components/ui/ProductGrid'

export default async function CatalogPage() {
  const products = await getProducts()

  return (
    <main>
      {products.length === 0 ? (
        <p>No products available</p>
      ) : (
        <ProductGrid products={products} />
      )}
    </main>
  )
}
