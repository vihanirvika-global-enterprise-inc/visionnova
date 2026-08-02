import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CartProvider, useCart } from '@/components/cart/CartContext'
import { MobileBottomNav } from './MobileBottomNav'
import type { Product } from '@/types'

const mockProduct: Product = {
  id: 'prod-001', name: 'Classic Frame', description: null,
  price: 89.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('MobileBottomNav', () => {
  it('renders links to Home, Shop, Cart, and Account within a mobile navigation landmark', () => {
    render(
      <CartProvider>
        <MobileBottomNav />
      </CartProvider>
    )

    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /^shop$/i })).toHaveAttribute('href', '/shop')
    expect(screen.getByRole('link', { name: /cart/i })).toHaveAttribute('href', '/cart')
  })

  it('shows the login link when logged out', () => {
    render(<CartProvider><MobileBottomNav /></CartProvider>)
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('shows a link to the account page when logged in', () => {
    render(<CartProvider><MobileBottomNav isLoggedIn /></CartProvider>)
    expect(screen.getByRole('link', { name: /account/i })).toHaveAttribute('href', '/account')
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()
  })

  it('shows the live cart item count on the cart link', () => {
    let addToCart: (p: Product) => void

    function Harness() {
      addToCart = useCart().addToCart
      return <MobileBottomNav />
    }

    render(<CartProvider><Harness /></CartProvider>)
    act(() => addToCart(mockProduct))
    act(() => addToCart(mockProduct))

    expect(screen.getByRole('link', { name: /cart \(2\)/i })).toBeInTheDocument()
  })

  it('is hidden above the mobile breakpoint', () => {
    render(<CartProvider><MobileBottomNav /></CartProvider>)
    const nav = screen.getByRole('navigation', { name: /mobile navigation/i })
    expect(nav.className).toMatch(/md:hidden/)
  })
})
