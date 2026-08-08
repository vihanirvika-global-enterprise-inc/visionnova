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

function renderButton(
  { placement, wishlisted = false }: { placement?: 'card' | 'inline'; wishlisted?: boolean } = {}
) {
  return render(
    <WishlistProvider
      initialWishlistedIds={wishlisted ? [mockProduct.id] : []}
      isLoggedIn={true}
    >
      <WishlistButton product={mockProduct} {...(placement ? { placement } : {})} />
    </WishlistProvider>
  )
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

// The button was hard-coded to the card corner (absolute right-3 top-3). The
// PDP needs the same control in normal flow, so placement became a prop rather
// than a second copy of the component.
describe('WishlistButton placement', () => {
  it('defaults to the card corner, so existing callers are unchanged', () => {
    renderButton()

    const button = screen.getByRole('button', { name: /wishlist/i })
    expect(button.className).toContain('absolute')
  })

  it('sits in normal flow when placed inline', () => {
    renderButton({ placement: 'inline' })

    const button = screen.getByRole('button', { name: /wishlist/i })
    expect(button.className).not.toContain('absolute')
  })

  // Icon-only in the corner, but the PDP has room for a label — and a lone
  // heart in a column of full-width controls reads as decoration.
  it('shows visible text when placed inline', () => {
    renderButton({ placement: 'inline' })

    expect(screen.getByRole('button', { name: /wishlist/i })).toHaveTextContent(/wishlist/i)
  })

  it('keeps the accessible name reflecting saved state in both placements', () => {
    renderButton({ placement: 'inline', wishlisted: true })

    expect(screen.getByRole('button', { name: 'Remove from wishlist' })).toBeInTheDocument()
  })
})
