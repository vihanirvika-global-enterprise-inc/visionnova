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

function renderCartWithProduct(product: Product = mockProduct) {
  let addToCart: (p: Product) => void

  function Harness() {
    addToCart = useCart().addToCart
    return <CartPage />
  }

  const utils = render(<CartProvider><Harness /></CartProvider>)
  act(() => addToCart(product))
  return utils
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
    renderCartWithProduct()

    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText('Total: $89.99')).toBeInTheDocument()
  })

  it('renders a proceed to checkout link when cart has items', () => {
    renderCartWithProduct()

    const link = screen.getByRole('link', { name: /proceed to checkout/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/checkout')
  })

  it('removes an item when the remove button is clicked', async () => {
    renderCartWithProduct()
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })

  describe('quantity stepper', () => {
    it('increments the quantity and the order total', async () => {
      renderCartWithProduct()

      await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))

      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Total: $179.98')).toBeInTheDocument()
    })

    it('decrements the quantity and the order total', async () => {
      renderCartWithProduct({ ...mockProduct, stockQuantity: 10 })
      await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))
      await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))
      // now at 3

      await userEvent.click(screen.getByRole('button', { name: /decrease quantity/i }))

      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Total: $179.98')).toBeInTheDocument()
    })

    it('removes the item and shows the empty-cart state when decremented to 0', async () => {
      renderCartWithProduct()

      await userEvent.click(screen.getByRole('button', { name: /decrease quantity/i }))

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    })

    it('does not increment past the product\'s stock on file', async () => {
      renderCartWithProduct({ ...mockProduct, stockQuantity: 1 })

      await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('Total: $89.99')).toBeInTheDocument()
    })
  })
})
