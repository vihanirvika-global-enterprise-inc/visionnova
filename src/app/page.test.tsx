import { render, screen } from '@testing-library/react'
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

  it('renders all three trust strip items', async () => {
    await renderHomePage()

    expect(screen.getByText('Licensed Optometrists')).toBeInTheDocument()
    expect(screen.getByText('Prescription Verified')).toBeInTheDocument()
    expect(screen.getByText('30-Day Returns')).toBeInTheDocument()
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

  it('renders the Why VisionNova value-prop tiles', async () => {
    await renderHomePage()

    expect(screen.getByRole('heading', { name: /why visionnova/i })).toBeInTheDocument()
    expect(screen.getByText('Premium Quality')).toBeInTheDocument()
    expect(screen.getByText('Optometrist-Checked')).toBeInTheDocument()
    expect(screen.getByText('Easy 30-Day Returns')).toBeInTheDocument()
  })
})
