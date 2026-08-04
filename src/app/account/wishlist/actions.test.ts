import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as Wishlist from '@/lib/wishlist'
import * as Session from '@/lib/session'
import { toggleWishlistAction } from './actions'

vi.mock('@/lib/wishlist', () => ({ addToWishlist: vi.fn(), removeFromWishlist: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })
})

afterEach(() => { vi.restoreAllMocks() })

describe('toggleWishlistAction', () => {
  it('returns an error when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    const result = await toggleWishlistAction('product-1', true)

    expect(result).toEqual({ error: expect.any(String) })
    expect(Wishlist.addToWishlist).not.toHaveBeenCalled()
  })

  it('adds the product to the wishlist when shouldAdd is true', async () => {
    const result = await toggleWishlistAction('product-1', true)

    expect(Wishlist.addToWishlist).toHaveBeenCalledWith('cust-1', 'product-1')
    expect(Wishlist.removeFromWishlist).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true })
  })

  it('removes the product from the wishlist when shouldAdd is false', async () => {
    const result = await toggleWishlistAction('product-1', false)

    expect(Wishlist.removeFromWishlist).toHaveBeenCalledWith('cust-1', 'product-1')
    expect(Wishlist.addToWishlist).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true })
  })
})
