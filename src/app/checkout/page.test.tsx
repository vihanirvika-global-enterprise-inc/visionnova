import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CartProvider, useCart } from '@/components/cart/CartContext'
import CheckoutPage from './page'
import type { Product } from '@/types'

const mockProduct: Product = {
  id: 'prod-001', name: 'Classic Frame', description: null,
  price: 89.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('CheckoutPage', () => {
  it('renders the order total and a place order button', () => {
    let addToCart: (p: Product) => void

    function Harness() {
      addToCart = useCart().addToCart
      return <CheckoutPage />
    }

    render(<CartProvider><Harness /></CartProvider>)
    act(() => addToCart(mockProduct))

    expect(screen.getByText('Total: $89.99')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument()
  })

  it('renders shipping address fields', () => {
    render(<CartProvider><CheckoutPage /></CartProvider>)
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument()
  })

  it('renders state and country fields', () => {
    render(<CartProvider><CheckoutPage /></CartProvider>)
    expect(screen.getByLabelText(/^state$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^country$/i)).toBeInTheDocument()
  })
})
