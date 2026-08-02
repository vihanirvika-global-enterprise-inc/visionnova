import { render, screen, act, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CartProvider, useCart } from '@/components/cart/CartContext'
import { Navbar } from './Navbar'
import type { Product } from '@/types'

// Navbar now also renders MobileBottomNav, which duplicates the Cart/Account/
// Shop/Sign In links — scope queries to the top nav landmark to avoid
// ambiguous matches across both.
function getMainNav() {
  return screen.getByRole('navigation', { name: /main navigation/i })
}

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
    const nav = getMainNav()
    expect(within(nav).getByRole('link', { name: /visionnova/i })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /cart/i })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /account/i })).toBeInTheDocument()
  })

  // WCAG 2.5.3 Label in Name: an aria-label of "Home" on a link reading
  // "VisionNova" leaves voice-control users with no way to say the link.
  it('gives the brand link an accessible name matching its visible text', () => {
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    )

    const brand = within(getMainNav()).getByRole('link', { name: /visionnova/i })
    expect(brand).toHaveAttribute('href', '/')
    expect(brand).not.toHaveAttribute('aria-label', 'Home')
  })

  it('renders a link to the shop catalog', () => {
    render(<CartProvider><Navbar /></CartProvider>)
    const shopLink = within(getMainNav()).getByRole('link', { name: /^shop$/i })
    expect(shopLink).toBeInTheDocument()
    expect(shopLink).toHaveAttribute('href', '/shop')
  })

  it('renders a link to login', () => {
    render(<CartProvider><Navbar /></CartProvider>)
    const loginLink = within(getMainNav()).getByRole('link', { name: /sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('shows a logout button when logged in', () => {
    render(<CartProvider><Navbar isLoggedIn /></CartProvider>)
    expect(within(getMainNav()).getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('hides the login link when logged in', () => {
    render(<CartProvider><Navbar isLoggedIn /></CartProvider>)
    expect(within(getMainNav()).queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument()
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

    expect(within(getMainNav()).getByRole('link', { name: /cart \(2\)/i })).toBeInTheDocument()
  })

  it('renders the MobileBottomNav alongside the top nav', () => {
    render(<CartProvider><Navbar /></CartProvider>)
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument()
  })
})
