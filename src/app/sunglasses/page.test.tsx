import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { formatPrice } from '@/lib/formatters'

vi.mock('@/lib/products', () => ({ getCatalogProductsByCategory: vi.fn() }))
vi.mock('@/components/shop/CatalogControls', () => ({
  CatalogControls: () => <div data-testid="catalog-controls" />,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/account/wishlist/actions', () => ({
  toggleWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-001', name: 'Aviator Sunglasses', description: null,
    price: 59.99, category: 'sunglasses' as const, sku: 'SG-001',
    stockQuantity: 10, imageUrl: null, requiresPrescription: false,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

async function renderSunglassesPage(searchParams: Record<string, string> = {}) {
  const { CartProvider } = await import('@/components/cart/CartContext')
  const { WishlistProvider } = await import('@/components/wishlist/WishlistContext')
  const SunglassesPage = (await import('./page')).default
  render(
    <CartProvider>
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={false}>
        {await SunglassesPage({ searchParams })}
      </WishlistProvider>
    </CartProvider>
  )
}

describe('SunglassesPage', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('queries the sunglasses category specifically', async () => {
    const { getCatalogProductsByCategory } = await import('@/lib/products')
    vi.mocked(getCatalogProductsByCategory).mockResolvedValueOnce({
      products: [makeProduct()], totalCount: 1,
    })

    await renderSunglassesPage()

    expect(getCatalogProductsByCategory).toHaveBeenCalledWith(
      'sunglasses', expect.objectContaining({})
    )
    expect(screen.getByText('Aviator Sunglasses')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(59.99))).toBeInTheDocument()
  })

  it('renders the search/sort controls', async () => {
    const { getCatalogProductsByCategory } = await import('@/lib/products')
    vi.mocked(getCatalogProductsByCategory).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderSunglassesPage()

    expect(screen.getByTestId('catalog-controls')).toBeInTheDocument()
  })

  it('shows an empty state when there are no sunglasses products', async () => {
    const { getCatalogProductsByCategory } = await import('@/lib/products')
    vi.mocked(getCatalogProductsByCategory).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderSunglassesPage()

    expect(screen.getByText('No products found')).toBeInTheDocument()
  })

  it('passes the q param through', async () => {
    const { getCatalogProductsByCategory } = await import('@/lib/products')
    vi.mocked(getCatalogProductsByCategory).mockResolvedValueOnce({
      products: [makeProduct({ name: 'Polarised Aviator' })], totalCount: 1,
    })

    await renderSunglassesPage({ q: 'polarised' })

    expect(getCatalogProductsByCategory).toHaveBeenCalledWith(
      'sunglasses', expect.objectContaining({ q: 'polarised' })
    )
  })
})
