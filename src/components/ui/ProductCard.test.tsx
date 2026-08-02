import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { CartProvider, useCart } from '@/components/cart/CartContext'
import { ProductCard } from './ProductCard'
import { formatPrice } from '@/lib/formatters'
import type { Product } from '@/types'

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
    render(<CartProvider><ProductCard product={mockProduct} /></CartProvider>)
    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(89.99))).toBeInTheDocument()
  })

  it('shows a prescription badge when requiresPrescription is true', () => {
    render(<CartProvider><ProductCard product={{ ...mockProduct, requiresPrescription: true }} /></CartProvider>)
    expect(screen.getByText('Requires Prescription')).toBeInTheDocument()
  })

  it('does not show a prescription badge when requiresPrescription is false', () => {
    render(<CartProvider><ProductCard product={mockProduct} /></CartProvider>)
    expect(screen.queryByText('Requires Prescription')).not.toBeInTheDocument()
  })

  it('does not render an Add to Cart button when the product is out of stock', () => {
    render(<CartProvider><ProductCard product={{ ...mockProduct, stockQuantity: 0 }} /></CartProvider>)
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
  })

  it('adds the product to the cart when Add to Cart is clicked', async () => {
    let itemCount = 0

    function Inspector() {
      itemCount = useCart().items.reduce((sum, i) => sum + i.quantity, 0)
      return null
    }

    render(
      <CartProvider>
        <ProductCard product={mockProduct} />
        <Inspector />
      </CartProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(itemCount).toBe(1)
  })
})
