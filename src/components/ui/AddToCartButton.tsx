'use client'

import { useCart } from '@/components/cart/CartContext'
import type { Product } from '@/types'

interface AddToCartButtonProps {
  product: Product
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addToCart } = useCart()
  return (
    <button
      className="btn-primary w-full"
      onClick={() => addToCart(product)}
    >
      Add to Cart
    </button>
  )
}
