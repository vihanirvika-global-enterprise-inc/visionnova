'use client'

import { useCart } from '@/components/cart/CartContext'
import { trackEvent } from '@/lib/analytics'
import type { Product } from '@/types'

interface AddToCartButtonProps {
  product: Product
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addToCart } = useCart()

  function handleClick() {
    addToCart(product)
    trackEvent({ event: 'add_to_cart', productId: product.id as unknown as number, price: product.price })
  }

  return (
    <button className="btn-primary w-full" onClick={handleClick}>
      Add to Cart
    </button>
  )
}
