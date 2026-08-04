import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import * as Session from '@/lib/session'
import * as Wishlist from '@/lib/wishlist'
import { useWishlist } from './WishlistContext'
import { WishlistProviderServer } from './WishlistProviderServer'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/wishlist', () => ({ getWishlistedProductIds: vi.fn() }))
vi.mock('@/app/account/wishlist/actions', () => ({
  toggleWishlistAction: vi.fn().mockResolvedValue({ ok: true }),
}))

function Inspector() {
  const { isLoggedIn, isWishlisted } = useWishlist()
  return (
    <p>
      loggedIn:{String(isLoggedIn)} wishlisted:{String(isWishlisted('prod-1'))}
    </p>
  )
}

describe('WishlistProviderServer', () => {
  it('provides isLoggedIn=false and no wishlisted ids when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    render(await WishlistProviderServer({ children: <Inspector /> }))

    expect(screen.getByText('loggedIn:false wishlisted:false')).toBeInTheDocument()
    expect(Wishlist.getWishlistedProductIds).not.toHaveBeenCalled()
  })

  it('fetches and provides the wishlisted product ids for a logged-in customer', async () => {
    vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
    vi.mocked(Wishlist.getWishlistedProductIds).mockResolvedValue(['prod-1'])

    render(await WishlistProviderServer({ children: <Inspector /> }))

    expect(Wishlist.getWishlistedProductIds).toHaveBeenCalledWith('cust-1')
    expect(screen.getByText('loggedIn:true wishlisted:true')).toBeInTheDocument()
  })
})
