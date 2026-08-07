import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Product } from '@/types'

vi.mock('@/lib/products', () => ({ getInStockProducts: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/account/wishlist/actions', () => ({
  toggleWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

async function renderHomePage(products: Product[] = []) {
  const { getInStockProducts } = await import('@/lib/products')
  vi.mocked(getInStockProducts).mockResolvedValueOnce(products)

  const { CartProvider } = await import('@/components/cart/CartContext')
  const { WishlistProvider } = await import('@/components/wishlist/WishlistContext')
  const HomePage = (await import('./page')).default
  return render(
    <CartProvider>
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={false}>
        {await HomePage()}
      </WishlistProvider>
    </CartProvider>
  )
}

const mockProduct: Product = {
  id: 'prod-001', name: 'Classic Aviator Frame', description: null,
  price: 89.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('HomePage', () => {
  it('renders a Shop Eyeglasses link to the catalog', async () => {
    await renderHomePage()

    const link = screen.getByRole('link', { name: /shop eyeglasses/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/shop')
  })

  it('renders an Upload Prescription link', async () => {
    await renderHomePage()

    const link = screen.getByRole('link', { name: /upload prescription/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/prescription-upload')
  })

  // Regression: primary moved from cyan to indigo in the design-token
  // milestone, but these two spots hardcoded raw cyan-* classes rather than
  // referencing a token — they read as a coherent cyan-to-cyan pairing
  // before that change, and a silently mismatched indigo/cyan pairing after.
  it('does not pair the (now indigo) primary token with a hardcoded cyan class', async () => {
    const { container } = await renderHomePage()

    const html = container.innerHTML
    expect(html).not.toMatch(/cyan-400/)
    expect(html).not.toMatch(/cyan-800/)
  })

  // Replaces the old trust strip + "Why VisionNova" trio, which between them
  // stated "30-Day Returns" twice with no mention of the shorter prescription
  // window. ValueStrip states the FAQ policy in full instead.
  it('surfaces optometrist verification in the value strip', async () => {
    await renderHomePage()

    // Scoped: the hero paragraph carries the same phrase.
    const strip = screen.getByRole('list', { name: /why visionnova/i })
    expect(within(strip).getByText(/verified by licensed optometrists/i)).toBeInTheDocument()
  })

  // Proves the product grid actually receives and renders what the DB query
  // returns, not just that the section wrapper exists around an empty grid.
  it('passes the fetched products through to the product grid', async () => {
    await renderHomePage([mockProduct])

    expect(screen.getByText('Classic Aviator Frame')).toBeInTheDocument()
  })

  // Featured Eyewear -> New Arrivals: matches what the query actually is
  // (getInStockProducts, newest-created-first) — there is no "featured"
  // concept at any layer (no column, no curation), so the label shouldn't
  // imply one exists.
  it('labels the product section New Arrivals, not Featured', async () => {
    await renderHomePage()

    expect(screen.getByRole('heading', { name: /new arrivals/i })).toBeInTheDocument()
    expect(screen.queryByText(/featured eyewear/i)).not.toBeInTheDocument()
  })

  it('keeps a Why VisionNova heading for the value strip', async () => {
    await renderHomePage()

    expect(screen.getByRole('heading', { name: /why visionnova/i })).toBeInTheDocument()
  })
})

// ── A1 enrichment ────────────────────────────────────────────────────────────

// The compliance bar moved to the root layout — the claims apply to the
// business, not to the homepage, and the mockup repeated them on every page.
// Its own assertions now live in ComplianceBar.test.tsx; what matters here is
// that the homepage does not render a second copy.
describe('HomePage — compliance bar', () => {
  it('does not render its own compliance bar, which the layout now owns', async () => {
    await renderHomePage()

    expect(screen.queryByRole('note', { name: /compliance/i })).not.toBeInTheDocument()
  })

  it('prints no statutory identifier numbers', async () => {
    const { container } = await renderHomePage()

    // GSTIN / CIN / licence numbers must never be invented. If real ones are
    // added later they belong in the footer, not as placeholder-shaped strings.
    expect(container.textContent).not.toMatch(/GSTIN|CIN|MFG\/\d/i)
  })
})

describe('HomePage — value strip', () => {
  it('states only claims the FAQ actually supports', async () => {
    await renderHomePage()

    const strip = screen.getByRole('list', { name: /why visionnova/i })
    expect(within(strip).getByText(/5–7 business days/i)).toBeInTheDocument()
    expect(within(strip).getByText(/30-day returns/i)).toBeInTheDocument()
    expect(within(strip).getByText(/14 days on prescription/i)).toBeInTheDocument()
  })

  // The mockup carried both; neither appears anywhere in the FAQ or the
  // catalogue, so shipping them would be an invented promise.
  it('makes no free-shipping or warranty promise', async () => {
    const { container } = await renderHomePage()

    expect(container.textContent).not.toMatch(/free shipping/i)
    expect(container.textContent).not.toMatch(/year warranty/i)
  })
})

describe('HomePage — price tiers', () => {
  it('offers the three approved tiers, each linking into the catalogue', async () => {
    await renderHomePage()

    const tiers = screen.getByRole('list', { name: /shop by price/i })
    for (const name of [/budget/i, /standard/i, /premium/i]) {
      expect(within(tiers).getByRole('link', { name })).toBeInTheDocument()
    }
  })

  // BLOCKED on A2: getCatalogProducts takes only { q, sort, page, pageSize } —
  // there is no price filter to link into yet. Until /shop supports one these
  // tiles are browse entry points, so they must not carry a query parameter
  // that the catalogue would silently ignore.
  it('links to the catalogue without a parameter /shop cannot honour', async () => {
    await renderHomePage()

    const tiers = screen.getByRole('list', { name: /shop by price/i })
    for (const name of [/budget/i, /standard/i, /premium/i]) {
      expect(within(tiers).getByRole('link', { name })).toHaveAttribute('href', '/shop')
    }
  })

  it('formats every band with the shared ₹ formatter', async () => {
    await renderHomePage()

    const tiers = screen.getByRole('list', { name: /shop by price/i })
    // en-IN grouping (₹2,499 not ₹2499) comes from formatPrice, so a band
    // typed by hand would fail here.
    expect(within(tiers).getByText('₹999 – ₹2,499')).toBeInTheDocument()
    expect(within(tiers).getByText('₹2,500 – ₹6,000')).toBeInTheDocument()
    expect(within(tiers).getByText('₹6,000+')).toBeInTheDocument()
  })
})

describe('HomePage — hero', () => {
  it('leads with the approved price-led headline', async () => {
    await renderHomePage()

    expect(screen.getByRole('heading', { level: 1, name: /quality eyewear from ₹999/i })).toBeInTheDocument()
  })

  // Only the ₹999 slide is confirmed real. The eye-test and buy-one-give-one
  // slides are pending confirmation that they are actual offers, so the hero
  // must not render carousel affordances for a single slide.
  it('shows no carousel controls while there is one slide', async () => {
    await renderHomePage()

    expect(screen.queryByRole('button', { name: /next slide/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /previous slide/i })).not.toBeInTheDocument()
  })

  it('makes no unconfirmed offer claim', async () => {
    const { container } = await renderHomePage()

    expect(container.textContent).not.toMatch(/buy one, give one/i)
    expect(container.textContent).not.toMatch(/free (home )?eye test/i)
  })
})

describe('HomePage — service banners', () => {
  it('routes visitors to the eye-test booking screen that exists', async () => {
    await renderHomePage()

    const banner = screen.getByRole('region', { name: /eye test/i })
    expect(within(banner).getByRole('link', { name: /book/i })).toHaveAttribute('href', '/eye-test')
  })

  it('makes no price claim about the consultation', async () => {
    await renderHomePage()

    // Nothing in the repo establishes the consult is free; the mockup's
    // "Free video eye test / ₹0 for first-time customers" is unsourced.
    const banner = screen.getByRole('region', { name: /eye test/i })
    expect(banner.textContent).not.toMatch(/free|₹0/i)
  })

  // CLAUDE.md scopes static-photo try-on into the MVP, but no route exists
  // under src/app yet. Linking to it would 404.
  it('does not link to the unbuilt try-on screen', async () => {
    const { container } = await renderHomePage()

    expect(container.querySelector('a[href*="try-on"]')).toBeNull()
  })
})
