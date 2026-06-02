import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { CartProvider, useCart } from '@/components/cart/CartContext'
import { AddToCartButton } from './AddToCartButton'
import type { Product } from '@/types'

const mockProduct: Product = {
  id: 'prod-001', name: 'Classic Frame', description: null,
  price: 89.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('AddToCartButton', () => {
  it('adds the product to the cart when clicked', async () => {
    let itemCount = 0

    function CartInspector() {
      itemCount = useCart().items.length
      return null
    }

    render(
      <CartProvider>
        <AddToCartButton product={mockProduct} />
        <CartInspector />
      </CartProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(itemCount).toBe(1)
  })
})
