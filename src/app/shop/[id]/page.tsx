import { getProductById } from '@/lib/products'
import { AddToCartButton } from '@/components/ui/AddToCartButton'

interface ProductPageProps {
  params: { id: string }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductById(params.id)

  if (!product) {
    return <main><p>Product not found</p></main>
  }

  return (
    <main>
      <h1>{product.name}</h1>
      <p>${product.price.toFixed(2)}</p>
      {product.description && (
        <p data-testid="product-description">{product.description}</p>
      )}
      <AddToCartButton product={product} />
    </main>
  )
}
