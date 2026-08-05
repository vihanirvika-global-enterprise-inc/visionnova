import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { formatPrice } from '@/lib/formatters'

vi.mock('@/lib/products', () => ({ getCatalogProducts: vi.fn() }))
vi.mock('@/components/shop/CatalogControls', () => ({
  CatalogControls: () => <div data-testid="catalog-controls" />,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/account/wishlist/actions', () => ({
  toggleWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-001', name: 'Classic Frame', description: null,
    price: 89.99, category: 'frames' as const, sku: 'CF-001',
    stockQuantity: 10, imageUrl: null, requiresPrescription: false,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

async function renderCatalogPage(searchParams: Record<string, string> = {}) {
  const { CartProvider } = await import('@/components/cart/CartContext')
  const { WishlistProvider } = await import('@/components/wishlist/WishlistContext')
  const CatalogPage = (await import('./page')).default
  render(
    <CartProvider>
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={false}>
        {await CatalogPage({ searchParams })}
      </WishlistProvider>
    </CartProvider>
  )
}

describe('CatalogPage', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('renders a ProductCard for each product', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct()], totalCount: 1,
    })

    await renderCatalogPage()

    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(89.99))).toBeInTheDocument()
  })

  it('shows an empty state when there are no products at all, with no search active', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderCatalogPage()

    expect(screen.getByText('No products found')).toBeInTheDocument()
  })

  it('renders the search/sort controls', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderCatalogPage()

    expect(screen.getByTestId('catalog-controls')).toBeInTheDocument()
  })

  it('links to the sunglasses and contact lens catalogs', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderCatalogPage()

    expect(screen.getByRole('link', { name: /sunglasses/i })).toHaveAttribute('href', '/sunglasses')
    expect(screen.getByRole('link', { name: /contact lenses/i })).toHaveAttribute('href', '/contacts')
  })
})

describe('CatalogPage — search', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('passes the q param through to getCatalogProducts', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct({ name: 'Aviator Classic' })], totalCount: 1,
    })

    await renderCatalogPage({ q: 'aviator' })

    expect(getCatalogProducts).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'aviator' })
    )
    expect(screen.getByText('Aviator Classic')).toBeInTheDocument()
  })

  it('passes an undefined q — not an empty string — when no search is active, so the base unfiltered set is returned', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct()], totalCount: 1,
    })

    await renderCatalogPage()

    expect(getCatalogProducts).toHaveBeenCalledWith(
      expect.objectContaining({ q: undefined })
    )
  })
})

describe('CatalogPage — sort', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it.each(['price_asc', 'price_desc', 'newest'] as const)(
    'passes sort=%s through to getCatalogProducts',
    async (sort) => {
      const { getCatalogProducts } = await import('@/lib/products')
      vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

      await renderCatalogPage({ sort })

      expect(getCatalogProducts).toHaveBeenCalledWith(
        expect.objectContaining({ sort })
      )
    }
  )

  it('defaults to newest when no sort param is present, matching current behavior', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderCatalogPage()

    expect(getCatalogProducts).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'newest' })
    )
  })

  it('falls back to newest for an invalid/unrecognised sort value rather than passing it through blindly', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderCatalogPage({ sort: 'not-a-real-sort' })

    expect(getCatalogProducts).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'newest' })
    )
  })
})

describe('CatalogPage — pagination', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('passes the page param through to getCatalogProducts', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderCatalogPage({ page: '3' })

    expect(getCatalogProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3 })
    )
  })

  it('defaults to page 1 when no page param is present', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderCatalogPage()

    expect(getCatalogProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    )
  })

  it('shows a Next link when there are more pages, and no Previous link on page 1', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct()], totalCount: 30,
    })

    await renderCatalogPage()

    expect(screen.getByRole('link', { name: /next/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /previous/i })).not.toBeInTheDocument()
  })

  it('shows both Previous and Next on a middle page', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct()], totalCount: 30,
    })

    await renderCatalogPage({ page: '2' })

    expect(screen.getByRole('link', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /next/i })).toBeInTheDocument()
  })

  it('shows no Next link on the last page', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    // 30 results, page size 12 -> 3 pages
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct()], totalCount: 30,
    })

    await renderCatalogPage({ page: '3' })

    expect(screen.queryByRole('link', { name: /next/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /previous/i })).toBeInTheDocument()
  })

  it('carries the current q and sort forward into the pagination links', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct()], totalCount: 30,
    })

    await renderCatalogPage({ q: 'aviator', sort: 'price_asc', page: '2' })

    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute(
      'href', '/shop?q=aviator&sort=price_asc&page=3'
    )
    expect(screen.getByRole('link', { name: /previous/i })).toHaveAttribute(
      'href', '/shop?q=aviator&sort=price_asc'
    )
  })

  // A stale bookmarked/shared URL pointing past the last page is a normal
  // navigation, not an error state.
  it('renders gracefully, not an error, for a page beyond the available results', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 5 })

    await renderCatalogPage({ page: '99' })

    expect(screen.getByText(/5 results/i)).toBeInTheDocument()
  })
})

describe('CatalogPage — result count', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('shows the real total count, not just the current page size', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct()], totalCount: 47,
    })

    await renderCatalogPage()

    expect(screen.getByText(/47 results/i)).toBeInTheDocument()
  })

  it('uses singular phrasing for exactly one result', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct()], totalCount: 1,
    })

    await renderCatalogPage()

    expect(screen.getByText(/1 result\b/i)).toBeInTheDocument()
  })
})

describe('CatalogPage — empty search result', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('shows a search-specific empty state with a working Clear search action', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderCatalogPage({ q: 'nonexistentproduct' })

    expect(screen.getByText(/no results/i)).toBeInTheDocument()
    const clearLink = screen.getByRole('link', { name: /clear search/i })
    expect(clearLink).toBeInTheDocument()
    expect(clearLink).toHaveAttribute('href', '/shop')
  })

  it('preserves the current sort when clearing search', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderCatalogPage({ q: 'nonexistentproduct', sort: 'price_asc' })

    expect(screen.getByRole('link', { name: /clear search/i })).toHaveAttribute(
      'href', '/shop?sort=price_asc'
    )
  })

  it('does not show the generic "no products found" empty state when a search yields zero results', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderCatalogPage({ q: 'nonexistentproduct' })

    expect(screen.queryByText('No products found')).not.toBeInTheDocument()
  })
})

describe('CatalogPage — combined search + sort + pagination', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('passes all three through together in one call', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct({ name: 'Aviator Classic' })], totalCount: 25,
    })

    await renderCatalogPage({ q: 'aviator', sort: 'price_desc', page: '2' })

    expect(getCatalogProducts).toHaveBeenCalledWith({
      q: 'aviator', sort: 'price_desc', page: 2, pageSize: expect.any(Number),
    })
    expect(screen.getByText('Aviator Classic')).toBeInTheDocument()
    expect(screen.getByText(/25 results/i)).toBeInTheDocument()
  })
})

// Proves this is real server-driven state, not client-side UI that happens
// to also read the URL once: constructing the exact searchParams shape
// Next.js would pass for a given URL and confirming the page renders the
// matching state end to end.
describe('CatalogPage — URL round-trip', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('renders the state matching /shop?q=aviator&sort=price_asc&page=2', async () => {
    const { getCatalogProducts } = await import('@/lib/products')
    vi.mocked(getCatalogProducts).mockResolvedValueOnce({
      products: [makeProduct({ name: 'Aviator Classic', price: 45 })], totalCount: 13,
    })

    await renderCatalogPage({ q: 'aviator', sort: 'price_asc', page: '2' })

    expect(getCatalogProducts).toHaveBeenCalledWith({
      q: 'aviator', sort: 'price_asc', page: 2, pageSize: expect.any(Number),
    })
    expect(screen.getByText('Aviator Classic')).toBeInTheDocument()
    expect(screen.getByText(/13 results/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /previous/i })).toHaveAttribute(
      'href', '/shop?q=aviator&sort=price_asc'
    )
  })
})
