import { getProducts } from '@/lib/products'
import { ProductCard } from '@/components/ui/ProductCard'

export default async function CatalogPage() {
  const products = await getProducts()

  return (
    <main>
      <div>
        {products.length === 0 ? (
          <p>No products available</p>
        ) : (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </main>
  )
}
