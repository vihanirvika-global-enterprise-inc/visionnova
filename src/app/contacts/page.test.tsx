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
    id: 'prod-001', name: 'Daily Contacts', description: null,
    price: 29.99, category: 'contacts' as const, sku: 'CL-001',
    stockQuantity: 10, imageUrl: null, requiresPrescription: true,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

async function renderContactsPage(searchParams: Record<string, string> = {}) {
  const { CartProvider } = await import('@/components/cart/CartContext')
  const { WishlistProvider } = await import('@/components/wishlist/WishlistContext')
  const ContactsPage = (await import('./page')).default
  render(
    <CartProvider>
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={false}>
        {await ContactsPage({ searchParams })}
      </WishlistProvider>
    </CartProvider>
  )
}

describe('ContactsPage', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('queries the contacts category specifically', async () => {
    const { getCatalogProductsByCategory } = await import('@/lib/products')
    vi.mocked(getCatalogProductsByCategory).mockResolvedValueOnce({
      products: [makeProduct()], totalCount: 1,
    })

    await renderContactsPage()

    expect(getCatalogProductsByCategory).toHaveBeenCalledWith(
      'contacts', expect.objectContaining({})
    )
    expect(screen.getByText('Daily Contacts')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(29.99))).toBeInTheDocument()
  })

  it('renders the search/sort controls', async () => {
    const { getCatalogProductsByCategory } = await import('@/lib/products')
    vi.mocked(getCatalogProductsByCategory).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderContactsPage()

    expect(screen.getByTestId('catalog-controls')).toBeInTheDocument()
  })

  it('shows an empty state when there are no contact lens products', async () => {
    const { getCatalogProductsByCategory } = await import('@/lib/products')
    vi.mocked(getCatalogProductsByCategory).mockResolvedValueOnce({ products: [], totalCount: 0 })

    await renderContactsPage()

    expect(screen.getByText('No products found')).toBeInTheDocument()
  })

  it('passes the q param through', async () => {
    const { getCatalogProductsByCategory } = await import('@/lib/products')
    vi.mocked(getCatalogProductsByCategory).mockResolvedValueOnce({
      products: [makeProduct({ name: 'Monthly Contacts' })], totalCount: 1,
    })

    await renderContactsPage({ q: 'monthly' })

    expect(getCatalogProductsByCategory).toHaveBeenCalledWith(
      'contacts', expect.objectContaining({ q: 'monthly' })
    )
  })
})
