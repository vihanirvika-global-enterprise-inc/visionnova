import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { CartProvider, useCart } from '@/components/cart/CartContext'
import { WishlistProvider } from '@/components/wishlist/WishlistContext'
import { ProductGrid } from './ProductGrid'
import type { Product } from '@/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/account/wishlist/actions', () => ({
  toggleWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

const mockProduct: Product = {
  id: 'prod-001', name: 'Classic Frame', description: null,
  price: 89.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('ProductGrid', () => {
  it('adds a product to the cart when Add to Cart is clicked', async () => {
    let itemCount = 0

    function CartInspector() {
      itemCount = useCart().items.length
      return null
    }

    render(
      <CartProvider>
        <WishlistProvider initialWishlistedIds={[]} isLoggedIn={false}>
          <ProductGrid products={[mockProduct]} />
          <CartInspector />
        </WishlistProvider>
      </CartProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(itemCount).toBe(1)
  })
})
