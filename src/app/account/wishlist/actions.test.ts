import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as Wishlist from '@/lib/wishlist'
import * as Session from '@/lib/session'
import { toggleWishlistAction } from './actions'

vi.mock('@/lib/wishlist', () => ({ addToWishlist: vi.fn(), removeFromWishlist: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

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

  // Without this, unhearting an item on /account/wishlist deletes the row and
  // flips the heart, but the card stays in the grid and the saved count keeps
  // its old number — the listing is a server render of getWishlist() and
  // nothing tells it to run again.
  it('revalidates the wishlist listing after a removal', async () => {
    const { revalidatePath } = await import('next/cache')

    await toggleWishlistAction('product-1', false)

    expect(revalidatePath).toHaveBeenCalledWith('/account/wishlist')
  })

  it('revalidates the wishlist listing after an addition', async () => {
    const { revalidatePath } = await import('next/cache')

    await toggleWishlistAction('product-1', true)

    expect(revalidatePath).toHaveBeenCalledWith('/account/wishlist')
  })

  it('does not revalidate when the toggle was rejected for having no session', async () => {
    const { revalidatePath } = await import('next/cache')
    vi.mocked(Session.getSession).mockReturnValue(null)

    await toggleWishlistAction('product-1', true)

    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
