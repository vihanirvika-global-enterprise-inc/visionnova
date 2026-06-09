import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CartProvider, useCart } from '@/components/cart/CartContext'
import { Navbar } from './Navbar'
import type { Product } from '@/types'

const mockProduct: Product = {
  id: 'prod-001', name: 'Classic Frame', description: null,
  price: 89.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('Navbar', () => {
  it('renders links to Home, Cart, and Account', () => {
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    )
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cart/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument()
  })

  it('renders a link to the shop catalog', () => {
    render(<CartProvider><Navbar /></CartProvider>)
    const shopLink = screen.getByRole('link', { name: /^shop$/i })
    expect(shopLink).toBeInTheDocument()
    expect(shopLink).toHaveAttribute('href', '/shop')
  })

  it('renders a link to login', () => {
    render(<CartProvider><Navbar /></CartProvider>)
    const loginLink = screen.getByRole('link', { name: /sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('shows a logout button when logged in', () => {
    render(<CartProvider><Navbar isLoggedIn /></CartProvider>)
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('hides the login link when logged in', () => {
    render(<CartProvider><Navbar isLoggedIn /></CartProvider>)
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()
  })

  it('shows item count on the cart link when cart has items', () => {
    let addToCart: (p: Product) => void

    function Harness() {
      addToCart = useCart().addToCart
      return <Navbar />
    }

    render(<CartProvider><Harness /></CartProvider>)
    act(() => addToCart(mockProduct))
    act(() => addToCart(mockProduct))

    expect(screen.getByRole('link', { name: /cart \(2\)/i })).toBeInTheDocument()
  })
})
