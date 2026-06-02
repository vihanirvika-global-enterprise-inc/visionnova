import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div>
      <p>{product.name}</p>
      <p>${product.price.toFixed(2)}</p>
      {product.requiresPrescription && <span>Requires Prescription</span>}
      {onAddToCart && (
        <button onClick={() => onAddToCart(product)}>Add to Cart</button>
      )}
    </div>
  )
}
