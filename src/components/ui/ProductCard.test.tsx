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

// The catalogue was a dead end: ProductCard rendered no link at all, so no
// product on /shop, /sunglasses, /contacts, /account/wishlist or the homepage
// could be clicked through to its detail page. Recorded as a P1 in
// docs/launch-readiness.md — a broken purchase funnel, not a nicety.
describe('ProductCard link to the product detail page', () => {
  it('links to the PDP route for its own product', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)

    expect(screen.getByRole('link', { name: mockProduct.name }))
      .toHaveAttribute('href', `/shop/${mockProduct.id}`)
  })

  it('uses the product id, not a fixed path', () => {
    const other = { ...mockProduct, id: 'prod-999', name: 'Round Metal Frame' }
    renderWithProviders(<ProductCard product={other} />)

    expect(screen.getByRole('link', { name: 'Round Metal Frame' }))
      .toHaveAttribute('href', '/shop/prod-999')
  })

  // The product name is the accessible name. A "Read more"-style label, or an
  // image link whose name is the alt text, both leave a screen-reader user
  // with a list of links they cannot tell apart.
  it('names the link after the product, and keeps it keyboard-focusable', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    const link = screen.getByRole('link', { name: mockProduct.name })

    expect(link.tagName).toBe('A')
    expect(link).not.toHaveAttribute('tabindex', '-1')
  })

  // The image is a second route to the same page for mouse users. Exposing it
  // as its own link would put two indistinguishable stops in the tab order for
  // every card, so it is hidden from assistive tech instead.
  it('exposes exactly one link per card to assistive technology', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)

    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('still lets a mouse user click the image through to the PDP', () => {
    const { container } = renderWithProviders(<ProductCard product={mockProduct} />)

    const hrefs = Array.from(container.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
    expect(hrefs.filter((h) => h === `/shop/${mockProduct.id}`)).toHaveLength(2)
  })

  // Nesting the Add to Cart button or the wishlist toggle inside the anchor
  // would be invalid HTML and would swallow their clicks.
  it('does not nest the cart or wishlist controls inside the link', () => {
    const { container } = renderWithProviders(<ProductCard product={mockProduct} />)

    for (const anchor of Array.from(container.querySelectorAll('a'))) {
      expect(anchor.querySelector('button')).toBeNull()
    }
  })
})

describe('ProductCard quick view', () => {
  it('offers a quick view for its product', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)

    expect(screen.getByRole('button', { name: `Quick view: ${mockProduct.name}` }))
      .toBeInTheDocument()
  })

  it('does not open the dialog until asked', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // The quick view must not swallow the card's own link — the funnel fixed in
  // the previous commit is the primary path, quick view is the shortcut.
  it('still links through to the PDP alongside the quick view', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)

    expect(screen.getByRole('link', { name: mockProduct.name }))
      .toHaveAttribute('href', `/shop/${mockProduct.id}`)
  })
})
