import { render, screen, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  // The catalogue link is now labelled "Eyeglasses" per the roadmap's header
  // IA — /shop is the eyeglasses catalogue, and the header lists categories
  // rather than a generic "Shop". MobileBottomNav still says Shop, which is
  // why this is scoped to the top nav.
  it('renders a link to the eyeglasses catalog', () => {
    render(<CartProvider><Navbar /></CartProvider>)
    const shopLink = within(getMainNav()).getByRole('link', { name: 'Eyeglasses' })
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

// ── Header nav IA ────────────────────────────────────────────────────────────

// Roadmap-confirmed top-level nav. Plain links, no hover mega-menu: hover-only
// panels are unreachable by keyboard and touch, so that stays a separate
// ticket rather than shipping an inaccessible interaction.
describe('Navbar category links', () => {
  const CATEGORIES: Array<[string, string]> = [
    ['Eyeglasses', '/shop'],
    ['Sunglasses', '/sunglasses'],
    ['Contact Lenses', '/contacts'],
    ['Eye Test', '/eye-test'],
    ['Stores', '/stores'],
  ]

  it.each(CATEGORIES)('links %s to %s', (label, href) => {
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    )

    expect(within(getMainNav()).getByRole('link', { name: label })).toHaveAttribute('href', href)
  })

  it('exposes every category as a real link, reachable by keyboard', () => {
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    )

    for (const [label] of CATEGORIES) {
      const link = within(getMainNav()).getByRole('link', { name: label })
      // An <a href> is focusable by default; a div with a click handler is not.
      expect(link.tagName).toBe('A')
      expect(link).not.toHaveAttribute('tabindex', '-1')
    }
  })

  // The mockup's mega-menu opened on mouseenter only, which excludes keyboard
  // and touch users entirely.
  it('renders no hover-triggered panel and no search box', () => {
    const { container } = render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    )

    expect(container.querySelector('input[type="search"]')).toBeNull()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /eyeglasses|sunglasses/i })).not.toBeInTheDocument()
  })
})

describe('Navbar wishlist link', () => {
  // The wishlist screen and its backing table are built, but nothing in the
  // header pointed at it — /account/wishlist was reachable only by typing it.
  it('links to the wishlist with an accessible name', () => {
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    )

    expect(within(getMainNav()).getByRole('link', { name: 'Wishlist' }))
      .toHaveAttribute('href', '/account/wishlist')
  })

  it('labels the icon-only control, since it has no visible text', () => {
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    )

    const link = within(getMainNav()).getByRole('link', { name: 'Wishlist' })
    expect(link).toHaveAttribute('aria-label', 'Wishlist')
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Navbar mobile menu', () => {
  // The hamburger menu is the only way to reach the categories below md, so
  // it has to carry the same IA as the desktop row — otherwise phone users
  // get a strictly smaller site.
  // jsdom applies no CSS, so the desktop row is in the DOM at every width —
  // asserting "the link exists after opening the menu" would pass even if the
  // dropdown were empty. Counting occurrences is what actually distinguishes
  // the two: one copy closed, two copies open.
  it('offers the same five categories as the desktop row', async () => {
    const user = userEvent.setup()
    render(<CartProvider><Navbar /></CartProvider>)
    const nav = getMainNav()
    const categories = ['Eyeglasses', 'Sunglasses', 'Contact Lenses', 'Eye Test', 'Stores']

    for (const label of categories) {
      expect(within(nav).getAllByRole('link', { name: label })).toHaveLength(1)
    }

    await user.click(screen.getByRole('button', { name: /toggle menu/i }))

    for (const label of categories) {
      expect(within(nav).getAllByRole('link', { name: label })).toHaveLength(2)
    }
  })

  it('no longer offers the retired About and Help links, open or closed', async () => {
    const user = userEvent.setup()
    render(<CartProvider><Navbar /></CartProvider>)

    // Both moved to the footer when the header became category-led. Checked
    // with the dropdown open too — that block renders separately, so a closed
    // menu proves nothing about what it contains.
    await user.click(screen.getByRole('button', { name: /toggle menu/i }))

    expect(within(getMainNav()).queryByRole('link', { name: 'About' })).not.toBeInTheDocument()
    expect(within(getMainNav()).queryByRole('link', { name: 'Help' })).not.toBeInTheDocument()
  })
})
