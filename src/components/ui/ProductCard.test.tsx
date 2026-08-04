import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { CartProvider, useCart } from '@/components/cart/CartContext'
import { WishlistProvider } from '@/components/wishlist/WishlistContext'
import { ProductCard } from './ProductCard'
import { formatPrice } from '@/lib/formatters'
import type { Product } from '@/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/account/wishlist/actions', () => ({
  toggleWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <CartProvider>
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={false}>
        {ui}
      </WishlistProvider>
    </CartProvider>
  )
}

const mockProduct: Product = {
  id: 'prod-001',
  name: 'Classic Frame',
  description: 'Timeless design',
  price: 89.99,
  category: 'frames',
  sku: 'CF-001',
  stockQuantity: 10,
  imageUrl: null,
  requiresPrescription: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ProductCard', () => {
  it('renders the product name and price', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(89.99))).toBeInTheDocument()
  })

  it('shows a prescription badge when requiresPrescription is true', () => {
    renderWithProviders(<ProductCard product={{ ...mockProduct, requiresPrescription: true }} />)
    expect(screen.getByText('Requires Prescription')).toBeInTheDocument()
  })

  it('does not show a prescription badge when requiresPrescription is false', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    expect(screen.queryByText('Requires Prescription')).not.toBeInTheDocument()
  })

  it('does not render an Add to Cart button when the product is out of stock', () => {
    renderWithProviders(<ProductCard product={{ ...mockProduct, stockQuantity: 0 }} />)
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
  })

  it('adds the product to the cart when Add to Cart is clicked', async () => {
    let itemCount = 0

    function Inspector() {
      itemCount = useCart().items.reduce((sum, i) => sum + i.quantity, 0)
      return null
    }

    renderWithProviders(
      <>
        <ProductCard product={mockProduct} />
        <Inspector />
      </>
    )

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(itemCount).toBe(1)
  })

  it('renders a wishlist toggle', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument()
  })
})
