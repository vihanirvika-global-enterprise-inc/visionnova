import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { CartProvider, useCart } from '@/components/cart/CartContext'
import CartPage from './page'
import type { Product } from '@/types'

const mockProduct: Product = {
  id: 'prod-001', name: 'Classic Frame', description: null,
  price: 89.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('CartPage', () => {
  it('shows an empty state when the cart has no items', () => {
    render(
      <CartProvider>
        <CartPage />
      </CartProvider>
    )
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })

  it('renders cart items and the order total', () => {
    let addToCart: (p: Product) => void

    function Harness() {
      addToCart = useCart().addToCart
      return <CartPage />
    }

    render(<CartProvider><Harness /></CartProvider>)
    act(() => addToCart(mockProduct))

    expect(screen.getByText('Classic Frame × 1')).toBeInTheDocument()
    expect(screen.getByText('Total: $89.99')).toBeInTheDocument()
  })

  it('removes an item when the remove button is clicked', async () => {
    let addToCart: (p: Product) => void

    function Harness() {
      addToCart = useCart().addToCart
      return <CartPage />
    }

    render(<CartProvider><Harness /></CartProvider>)
    act(() => addToCart(mockProduct))
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })
})
