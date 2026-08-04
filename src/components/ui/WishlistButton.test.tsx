import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WishlistButton } from './WishlistButton'
import { WishlistProvider } from '@/components/wishlist/WishlistContext'
import type { Product } from '@/types'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
vi.mock('@/app/account/wishlist/actions', () => ({
  toggleWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

const mockProduct: Product = {
  id: 'prod-001', name: 'Classic Frame', description: null,
  price: 89.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('WishlistButton', () => {
  it('sends a logged-out click to /login instead of toggling', async () => {
    render(
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={false}>
        <WishlistButton product={mockProduct} />
      </WishlistProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: /add to wishlist/i }))

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('toggles wishlisted state on click when logged in', async () => {
    render(
      <WishlistProvider initialWishlistedIds={[]} isLoggedIn={true}>
        <WishlistButton product={mockProduct} />
      </WishlistProvider>
    )

    const button = screen.getByRole('button', { name: /add to wishlist/i })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(button)

    expect(screen.getByRole('button', { name: /remove from wishlist/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('reflects an already-wishlisted product on initial render', () => {
    render(
      <WishlistProvider initialWishlistedIds={['prod-001']} isLoggedIn={true}>
        <WishlistButton product={mockProduct} />
      </WishlistProvider>
    )

    expect(screen.getByRole('button', { name: /remove from wishlist/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})
