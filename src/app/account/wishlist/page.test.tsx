import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { formatPrice } from '@/lib/formatters'

vi.mock('@/lib/wishlist', () => ({ getWishlist: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
  useRouter: () => ({ push: vi.fn() }),
}))
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

async function renderWishlistPage() {
  const { CartProvider } = await import('@/components/cart/CartContext')
  const { WishlistProvider } = await import('@/components/wishlist/WishlistContext')
  const WishlistPage = (await import('./page')).default
  render(
    <CartProvider>
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={true}>
        {await WishlistPage()}
      </WishlistProvider>
    </CartProvider>
  )
}

describe('WishlistPage', () => {
  it('redirects to /login when there is no session', async () => {
    const { getSession } = await import('@/lib/session')
    const { redirect } = await import('next/navigation')
    vi.mocked(getSession).mockReturnValue(null)

    await expect(renderWishlistPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('renders the wishlisted products for the session customer', async () => {
    const { getSession } = await import('@/lib/session')
    const { getWishlist } = await import('@/lib/wishlist')
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
    vi.mocked(getWishlist).mockResolvedValueOnce([makeProduct()])

    await renderWishlistPage()

    expect(getWishlist).toHaveBeenCalledWith('cust-1')
    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(89.99))).toBeInTheDocument()
  })

  // "items", not the mockup's "frames": the wishlist can hold contact lenses
  // and lens packages too (ProductCategory has four values), so "frames saved"
  // would be wrong the moment someone saves a box of dailies.
  it('counts the saved items, pluralised', async () => {
    const { getSession } = await import('@/lib/session')
    const { getWishlist } = await import('@/lib/wishlist')
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
    vi.mocked(getWishlist).mockResolvedValueOnce([
      makeProduct(),
      makeProduct({ id: 'prod-002', name: 'Round Metal', sku: 'RM-002' }),
    ])

    await renderWishlistPage()

    expect(screen.getByText('2 items saved')).toBeInTheDocument()
  })

  it('uses the singular when exactly one item is saved', async () => {
    const { getSession } = await import('@/lib/session')
    const { getWishlist } = await import('@/lib/wishlist')
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
    vi.mocked(getWishlist).mockResolvedValueOnce([makeProduct()])

    await renderWishlistPage()

    expect(screen.getByText('1 item saved')).toBeInTheDocument()
  })

  // ProductGrid's generic "No products found" is catalogue-filter language: it
  // tells you a search matched nothing. An empty wishlist is a different
  // situation — nothing is wrong, you just haven't saved anything — and it
  // needs to say how saving works.
  it('shows a wishlist-specific empty state, not the catalogue one', async () => {
    const { getSession } = await import('@/lib/session')
    const { getWishlist } = await import('@/lib/wishlist')
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
    vi.mocked(getWishlist).mockResolvedValueOnce([])

    await renderWishlistPage()

    expect(screen.getByRole('heading', { name: 'Nothing saved yet' })).toBeInTheDocument()
    expect(screen.queryByText('No products found')).not.toBeInTheDocument()
  })

  it('tells the customer how to save an item and links to the catalogue', async () => {
    const { getSession } = await import('@/lib/session')
    const { getWishlist } = await import('@/lib/wishlist')
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
    vi.mocked(getWishlist).mockResolvedValueOnce([])

    await renderWishlistPage()

    expect(screen.getByText(/save it for later/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse eyewear/i })).toHaveAttribute('href', '/shop')
  })

  it('reports zero saved items rather than hiding the count', async () => {
    const { getSession } = await import('@/lib/session')
    const { getWishlist } = await import('@/lib/wishlist')
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
    vi.mocked(getWishlist).mockResolvedValueOnce([])

    await renderWishlistPage()

    expect(screen.getByText('0 items saved')).toBeInTheDocument()
  })
})
