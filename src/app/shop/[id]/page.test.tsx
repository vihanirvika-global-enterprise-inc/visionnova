import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import { formatPrice } from '@/lib/formatters'
import { AXE_OPTIONS } from '@/test/axeOptions'

vi.mock('@/lib/products', () => ({ getProductById: vi.fn() }))
vi.mock('@/lib/productImages', () => ({ getProductImages: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/app/account/wishlist/actions', () => ({
  toggleWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: 'Timeless design',
    price: 89.99, category: 'frames' as const, sku: 'CF-001',
    stockQuantity: 10, imageUrl: null, requiresPrescription: false,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

async function renderProductPage(id = '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6') {
  const { CartProvider } = await import('@/components/cart/CartContext')
  const { WishlistProvider } = await import('@/components/wishlist/WishlistContext')
  const ProductPage = (await import('./page')).default
  return render(
    <CartProvider>
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={true}>
        {await ProductPage({ params: { id } })}
      </WishlistProvider>
    </CartProvider>
  )
}

describe('ProductPage', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValue([])
  })

  it('renders the product name and price', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: 'Timeless design',
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(89.99))).toBeInTheDocument()
  })

  // Was a 200 response containing the words "Product not found", so every bad
  // or stale product id indexed as a live page. notFound() is the convention
  // five admin routes already follow, and it is what actually returns 404.
  it('returns a 404 rather than a 200 page when the product does not exist', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(null)
    const { notFound } = await import('next/navigation')

    const ProductPage = (await import('./page')).default
    await expect(ProductPage({ params: { id: '00000000-0000-0000-0000-000000000000' } })).rejects.toThrow('NEXT_NOT_FOUND')

    expect(notFound).toHaveBeenCalled()
  })

  it('does not render a soft not-found body of its own', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(null)

    const ProductPage = (await import('./page')).default
    await expect(ProductPage({ params: { id: '00000000-0000-0000-0000-000000000000' } })).rejects.toThrow()

    // Nothing rendered: the not-found UI belongs to Next's boundary, not here.
    expect(screen.queryByText('Product not found')).not.toBeInTheDocument()
  })

  it('renders the description when present', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: 'Timeless design',
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.getByText('Timeless design')).toBeInTheDocument()
  })

  it('renders nothing for description when it is null', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.queryByTestId('product-description')).not.toBeInTheDocument()
  })

  it('shows out of stock message when product has no stock', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 0, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
  })
})

describe('ProductPage — lens builder', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValue([])
  })

  it('shows the lens builder for a prescription-required product', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: 'prod-002', name: 'Rx Frame', description: null,
      price: 129.99, category: 'frames' as const, sku: 'RX-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: true,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('7ab391c5-82df-4e11-9c02-1d5b7e6a4f88')

    expect(screen.getByText('Build Your Lenses')).toBeInTheDocument()
    expect(screen.getByLabelText(/lens type/i)).toBeInTheDocument()
  })

  it('does not show the lens builder for a non-prescription product', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.queryByText('Build Your Lenses')).not.toBeInTheDocument()
  })
})

describe('ProductPage — try-on preview', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValue([])
  })

  it('shows the try-on upload prompt when the product has an image', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: 'https://cdn.example/frame.png', requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.getByText('Try It On')).toBeInTheDocument()
  })

  it('does not show the try-on section when the product has no image', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.queryByText('Try It On')).not.toBeInTheDocument()
  })
})

describe('ProductPage — image gallery', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValue({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: 'https://cdn.example/legacy.jpg', requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })
  })

  it('renders every real product_images row, in order, with real alt text', async () => {
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValueOnce([
      { id: 'img-1', productId: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', url: 'https://cdn.example/1.jpg', alt: 'Front view', sortOrder: 0, createdAt: new Date() },
      { id: 'img-2', productId: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', url: 'https://cdn.example/2.jpg', alt: 'Side view', sortOrder: 1, createdAt: new Date() },
      { id: 'img-3', productId: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', url: 'https://cdn.example/3.jpg', alt: 'Case included', sortOrder: 2, createdAt: new Date() },
    ])

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    const thumbnails = screen.getAllByRole('tab')
    expect(thumbnails).toHaveLength(3)
    expect(thumbnails[0]).toHaveAccessibleName(/1 of 3/)
    expect(thumbnails[1]).toHaveAccessibleName(/2 of 3/)
    expect(thumbnails[2]).toHaveAccessibleName(/3 of 3/)
    expect(screen.getAllByAltText('Front view').length).toBeGreaterThan(0)
  })

  it('does not crash and falls back gracefully when a product has zero product_images rows', async () => {
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValueOnce([])

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.getByAltText('Classic Frame')).toHaveAttribute(
      'src', expect.stringContaining('legacy.jpg')
    )
  })
})

describe('ProductPage — return policy & delivery reassurance', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValue([])
  })

  it('shows the 30-day return window for a non-prescription product, matching /help', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.getByText(/30-day returns/i)).toBeInTheDocument()
    expect(screen.queryByText(/14-day returns/i)).not.toBeInTheDocument()
  })

  it('shows the 14-day return window for a prescription-required product, matching /help', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: 'prod-002', name: 'Rx Frame', description: null,
      price: 129.99, category: 'frames' as const, sku: 'RX-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: true,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('7ab391c5-82df-4e11-9c02-1d5b7e6a4f88')

    expect(screen.getByText(/14-day returns/i)).toBeInTheDocument()
    expect(screen.queryByText(/30-day returns/i)).not.toBeInTheDocument()
  })

  it('shows a free return shipping callout', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.getByText(/free return shipping/i)).toBeInTheDocument()
  })

  it('shows a static delivery estimate matching the figure already on /help', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.getByText(/5–7 business days/i)).toBeInTheDocument()
  })

  it('links to /help for the full policy rather than duplicating it', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.getByRole('link', { name: /full policy/i })).toHaveAttribute('href', '/help')
  })

  it('shows the reassurance section even when the product is out of stock', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 0, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(screen.getByText(/30-day returns/i)).toBeInTheDocument()
  })
})

// The PDP had no metadata at all — every product inherited the root <title>,
// on the most-linked page type in the site. generateMetadata is used nowhere
// else in the app, so this is new ground rather than an inconsistency.
describe('ProductPage — metadata', () => {
  it('titles the page after the real product', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(
      makeProduct({ name: 'Classic Tortoise Frame' })
    )
    const { generateMetadata } = await import('./page')

    const meta = await generateMetadata({ params: { id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6' } })

    expect(meta.title).toBe('Classic Tortoise Frame')
  })

  it("describes it with the product's own description, not invented copy", async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(
      makeProduct({ description: 'Handcrafted acetate with single-vision lenses.' })
    )
    const { generateMetadata } = await import('./page')

    const meta = await generateMetadata({ params: { id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6' } })

    expect(meta.description).toBe('Handcrafted acetate with single-vision lenses.')
  })

  // A product with no description gets none — a generated one would be
  // marketing copy nobody approved, on a medical-device listing.
  it('omits the description rather than inventing one', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(makeProduct({ description: null }))
    const { generateMetadata } = await import('./page')

    const meta = await generateMetadata({ params: { id: '6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6' } })

    expect(meta.description).toBeUndefined()
  })

  // Must call notFound() rather than returning a fallback title. Returning
  // metadata lets Next resolve the head and begin the response, so by the time
  // the page body calls notFound() the status is already committed and the
  // 404 degrades into a 200 with not-found-looking content. Verified against a
  // production build: with a fallback title /shop/nope returned 200.
  it('triggers the 404 from metadata, before the response can commit', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(null)
    const { generateMetadata } = await import('./page')

    await expect(generateMetadata({ params: { id: '00000000-0000-0000-0000-000000000000' } })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('ProductPage — wishlist', () => {
  it('offers a wishlist toggle for the product', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(makeProduct())

    await renderProductPage()

    expect(screen.getByRole('button', { name: /wishlist/i })).toBeInTheDocument()
  })

  // Inline placement, not the card corner: an absolutely-positioned heart
  // would float over the gallery in this layout.
  it('places the toggle in normal flow, not pinned to a corner', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(makeProduct())

    await renderProductPage()

    expect(screen.getByRole('button', { name: /wishlist/i }).className)
      .not.toContain('absolute')
  })

  it('offers the toggle even when the product is out of stock', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(makeProduct({ stockQuantity: 0 }))

    await renderProductPage()

    // Saving something you cannot buy yet is the main reason a wishlist exists.
    expect(screen.getByRole('button', { name: /wishlist/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
  })
})

// A5 omissions. The mockup carried ratings, a review list, a millimetre spec
// table, colour swatches and a struck-through MRP. None has a data source:
// there is no reviews table (see drop-optometrist-reviews.sql), no dimension
// columns on `products`, no accessor for product_variants, and no MRP column.
describe('ProductPage — ships no fabricated content', () => {
  async function renderWithProduct() {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(makeProduct())
    return renderProductPage()
  }

  it('shows no rating, star or review count', async () => {
    const { container } = await renderWithProduct()
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/\breviews?\b/i)
    expect(text).not.toMatch(/verified purchases?/i)
    expect(text).not.toMatch(/\d(\.\d)?\s*(★|\/\s*5\b)/)
    expect(text).not.toMatch(/★/)
  })

  it('shows no frame-dimension spec table', async () => {
    const { container } = await renderWithProduct()
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/lens width|bridge|temple/i)
    expect(text).not.toMatch(/\b\d{2,3}\s?mm\b/i)
  })

  it('shows no MRP, strike-through or discount percentage', async () => {
    const { container } = await renderWithProduct()
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/M\.?R\.?P/i)
    expect(text).not.toMatch(/%\s*off/i)
    expect(container.querySelector('.line-through')).toBeNull()
  })

  // Colour would come from product_variants — a table that exists with zero
  // accessors anywhere in src/. Swatches would be invented, not read.
  it('offers no colour-swatch control', async () => {
    const { container } = await renderWithProduct()

    const labels = Array.from(container.querySelectorAll('[aria-label], label'))
      .map((el) => (el.getAttribute('aria-label') || el.textContent || '').toLowerCase())
    expect(labels.some((l) => /colou?r/.test(l))).toBe(false)
  })

  it('offers no "pair with these" upsell, which has no relation model', async () => {
    const { container } = await renderWithProduct()

    expect(container.textContent ?? '').not.toMatch(/pair with|you may also like|customers also/i)
  })
})

describe('ProductPage — accessibility', () => {
  it('has no WCAG 2.1 AA violations axe can detect', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(makeProduct())

    const { container } = await renderProductPage()

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([])
  })
})

// A malformed id reached Postgres as a raw string against a uuid column and
// threw `invalid input syntax for type uuid` before notFound() was ever
// considered — an unhandled DB error, served through global-error.tsx as a
// 200. Guarding the shape means it never reaches the query.
describe('ProductPage — malformed id', () => {
  // This block asserts on call history, so it needs its own reset — the
  // beforeEach above belongs to the first describe only.
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('404s a non-UUID id without querying the database', async () => {
    const { getProductById } = await import('@/lib/products')
    const ProductPage = (await import('./page')).default

    await expect(ProductPage({ params: { id: 'not-a-uuid' } })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getProductById).not.toHaveBeenCalled()
  })

  it('404s from metadata too, without querying', async () => {
    const { getProductById } = await import('@/lib/products')
    const { generateMetadata } = await import('./page')

    await expect(generateMetadata({ params: { id: '../../etc/passwd' } })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getProductById).not.toHaveBeenCalled()
  })

  it('still queries for a well-formed uuid', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(makeProduct())

    await renderProductPage('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')

    expect(getProductById).toHaveBeenCalledWith('6fd472e4-71cf-4dd0-bd57-3f9452ccd3f6')
  })
})
