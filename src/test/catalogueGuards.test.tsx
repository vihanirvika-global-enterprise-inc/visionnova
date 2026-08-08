import { render, screen, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import { AXE_OPTIONS } from './axeOptions'

// Guards for A2/A3/A4. The catalogues deliberately ship no attribute filter
// rail: it would filter on frame shape, material, gender, polarised, UV400 and
// lens colour, none of which exist as columns on `products`. Adding them means
// inventing values for all eight seeded rows — fabricated product data on a
// medical-device storefront, not a stub.
//
// Until this file existed the omission was enforced by a code comment, which
// is to say by nothing: a contributor could add a "Frame shape" checkbox group
// with made-up values and the suite would stay green.
//
// These render the REAL CatalogControls. The per-page test files stub it out,
// which is precisely where a filter rail would be added, so a guard that
// inherited that stub would be blind to the thing it exists to catch.
vi.mock('@/lib/products', () => ({
  getCatalogProducts: vi.fn(),
  getCatalogProductsByCategory: vi.fn(),
}))
vi.mock('@/app/account/wishlist/actions', () => ({
  toggleWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/shop',
  useSearchParams: () => new URLSearchParams(),
}))

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-001', name: 'Classic Frame', description: 'Handcrafted acetate.',
    price: 89.99, category: 'frames' as const, sku: 'CF-001',
    stockQuantity: 10, imageUrl: null, requiresPrescription: false,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

const CATALOGUES = [
  { name: '/shop', importPath: '@/app/shop/(catalog)/page', accessor: 'getCatalogProducts' },
  { name: '/sunglasses', importPath: '@/app/sunglasses/page', accessor: 'getCatalogProductsByCategory' },
  { name: '/contacts', importPath: '@/app/contacts/page', accessor: 'getCatalogProductsByCategory' },
] as const

async function renderCatalogue(importPath: string, accessor: string) {
  const products = await import('@/lib/products')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked((products as any)[accessor]).mockResolvedValue({
    products: [makeProduct(), makeProduct({ id: 'prod-002', name: 'Round Metal', sku: 'RM-002' })],
    totalCount: 2,
  })

  const { CartProvider } = await import('@/components/cart/CartContext')
  const { WishlistProvider } = await import('@/components/wishlist/WishlistContext')
  const Page = (await import(/* @vite-ignore */ importPath)).default

  return render(
    <CartProvider>
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={false}>
        {await Page({ searchParams: {} })}
      </WishlistProvider>
    </CartProvider>
  )
}

beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

describe.each(CATALOGUES)('$name — no fabricated attribute filters', ({ importPath, accessor }) => {
  // Structural, not word-matching. An earlier version of this check greped the
  // page text for "polarised" and failed — because "Polarised Aviator
  // Sunglasses" is a real product name in the seed. A rail is checkboxes and a
  // Filters heading; that is what to look for.
  it('renders no filter checkboxes', async () => {
    const { container } = await renderCatalogue(importPath, accessor)

    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
  })

  it('renders no radio-group filter controls', async () => {
    const { container } = await renderCatalogue(importPath, accessor)

    expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(0)
  })

  it('renders no Filters heading or region', async () => {
    await renderCatalogue(importPath, accessor)

    expect(screen.queryByRole('heading', { name: /^filters?$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /^filters?$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /^filters?$/i })).not.toBeInTheDocument()
  })

  // A rail would have to reach the server somehow. Nothing may offer to filter
  // on an attribute the products table cannot answer.
  it('offers no control that filters on an attribute we do not hold', async () => {
    const { container } = await renderCatalogue(importPath, accessor)

    const controlNames = Array.from(
      container.querySelectorAll('label, select, fieldset legend, [aria-label]')
    ).map((el) => (el.getAttribute('aria-label') || el.textContent || '').trim().toLowerCase())

    for (const attribute of ['frame shape', 'material', 'gender', 'lens colour', 'lens color', 'uv400']) {
      expect(controlNames.some((name) => name.includes(attribute))).toBe(false)
    }
  })

  it('links to no filter query parameter the accessor cannot honour', async () => {
    const { container } = await renderCatalogue(importPath, accessor)

    const hrefs = Array.from(container.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') ?? '')
    const forbidden = /[?&](shape|material|gender|polarised|polarized|uv|lensColou?r|minPrice|maxPrice|tier)=/i
    expect(hrefs.filter((href) => forbidden.test(href))).toEqual([])
  })
})

describe.each(CATALOGUES)('$name — accessibility', ({ importPath, accessor }) => {
  it('has no WCAG 2.1 AA violations axe can detect', async () => {
    const { container } = await renderCatalogue(importPath, accessor)

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([])
  })

  it('exposes the results count as a live region, not silent text', async () => {
    await renderCatalogue(importPath, accessor)

    // Search and sort replace the grid without a page load; without a status
    // region a screen-reader user gets no confirmation anything happened.
    expect(screen.getByRole('status')).toHaveTextContent(/\d+ results?/)
  })
})

describe('catalogue sort options', () => {
  it('offers exactly the three sorts that map to real columns', async () => {
    const { CatalogControls } = await import('@/components/shop/CatalogControls')
    render(<CatalogControls />)

    const options = within(screen.getByLabelText(/sort by/i))
      .getAllByRole('option')
      .map((o) => o.textContent?.trim())

    // The mockup also offered "Popularity" and "Discount %". Neither has a
    // source column, and discount implies an MRP we deliberately do not hold.
    expect(options).toEqual(['Newest', 'Price: Low to High', 'Price: High to Low'])
  })

  it('offers no sort whose ordering we cannot actually compute', async () => {
    const { CatalogControls } = await import('@/components/shop/CatalogControls')
    render(<CatalogControls />)

    const values = within(screen.getByLabelText(/sort by/i))
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)

    for (const fabricated of ['popularity', 'discount', 'rating', 'bestselling']) {
      expect(values).not.toContain(fabricated)
    }
  })
})
