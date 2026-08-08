import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { CartProvider } from '@/components/cart/CartContext'
import { WishlistProvider } from '@/components/wishlist/WishlistContext'
import { QuickView } from './QuickView'
import { formatPrice } from '@/lib/formatters'
import type { Product } from '@/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/account/wishlist/actions', () => ({
  toggleWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

const product: Product = {
  id: 'prod-001',
  name: 'Classic Tortoise Frame',
  description: 'Handcrafted acetate with single-vision lenses included.',
  price: 89.99,
  category: 'frames',
  sku: 'CTF-001',
  stockQuantity: 4,
  imageUrl: null,
  requiresPrescription: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function renderQuickView(overrides: Partial<Product> = {}) {
  return render(
    <CartProvider>
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={false}>
        <QuickView product={{ ...product, ...overrides }} />
      </WishlistProvider>
    </CartProvider>
  )
}

describe('QuickView trigger', () => {
  it('names the trigger after its product, so cards are distinguishable', () => {
    renderQuickView()

    expect(screen.getByRole('button', { name: 'Quick view: Classic Tortoise Frame' }))
      .toBeInTheDocument()
  })

  it('keeps the dialog closed until asked', () => {
    renderQuickView()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('QuickView dialog', () => {
  async function open(overrides: Partial<Product> = {}) {
    const user = userEvent.setup()
    renderQuickView(overrides)
    await user.click(screen.getByRole('button', { name: /^Quick view:/ }))
    return { user, dialog: await screen.findByRole('dialog') }
  }

  it('shows the product summary without leaving the catalogue', async () => {
    const { dialog } = await open()

    expect(within(dialog).getByRole('heading', { name: 'Classic Tortoise Frame' })).toBeInTheDocument()
    expect(within(dialog).getByText(formatPrice(89.99))).toBeInTheDocument()
    expect(within(dialog).getByText(/handcrafted acetate/i)).toBeInTheDocument()
  })

  it('offers a route to the full detail page', async () => {
    const { dialog } = await open()

    expect(within(dialog).getByRole('link', { name: /full details/i }))
      .toHaveAttribute('href', '/shop/prod-001')
  })

  it('lets the customer add to cart from the dialog', async () => {
    const { dialog } = await open()

    expect(within(dialog).getByRole('button', { name: /add to cart/i })).toBeInTheDocument()
  })

  it('states stock and the prescription requirement', async () => {
    const { dialog } = await open()

    expect(within(dialog).getByText(/in stock/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/requires prescription/i)).toBeInTheDocument()
  })

  it('offers no add-to-cart for an out-of-stock product', async () => {
    const { dialog } = await open({ stockQuantity: 0 })

    expect(within(dialog).queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
    expect(within(dialog).getByText(/out of stock/i)).toBeInTheDocument()
  })

  it('closes on the close control', async () => {
    const { user } = await open()

    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // Standing rulings: no invented MRP or strike-through (Legal Metrology), no
  // ratings — there is no reviews table — and tier badges wait for the
  // catalogue reprice. The mockup showed all three on every card.
  it('invents no MRP, rating or tier badge', async () => {
    const { dialog } = await open()
    const text = dialog.textContent ?? ''

    expect(text).not.toMatch(/M\.?R\.?P/i)
    expect(text).not.toMatch(/% off/i)
    expect(text).not.toMatch(/\b\d\.\d\s*(★|stars?|\/\s*5)/i)
    expect(text).not.toMatch(/\b(Budget|Standard|Premium)\b/)
    expect(dialog.querySelector('.line-through')).toBeNull()
  })
})
