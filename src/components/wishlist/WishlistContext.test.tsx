import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WishlistProvider, useWishlist } from './WishlistContext'
import * as Actions from '@/app/account/wishlist/actions'

vi.mock('@/app/account/wishlist/actions', () => ({ toggleWishlistAction: vi.fn() }))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <WishlistProvider initialWishlistedIds={['prod-existing']} isLoggedIn={true}>
      {children}
    </WishlistProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Actions.toggleWishlistAction).mockResolvedValue({ ok: true })
})

describe('useWishlist', () => {
  it('reflects the initial wishlisted ids passed in from the server', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper })
    expect(result.current.isWishlisted('prod-existing')).toBe(true)
    expect(result.current.isWishlisted('prod-other')).toBe(false)
  })

  it('optimistically marks a product wishlisted and persists it', async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper })

    act(() => result.current.toggleWishlist('prod-new'))

    expect(result.current.isWishlisted('prod-new')).toBe(true)
    await waitFor(() =>
      expect(Actions.toggleWishlistAction).toHaveBeenCalledWith('prod-new', true)
    )
  })

  it('optimistically unmarks an already-wishlisted product and persists it', async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper })

    act(() => result.current.toggleWishlist('prod-existing'))

    expect(result.current.isWishlisted('prod-existing')).toBe(false)
    await waitFor(() =>
      expect(Actions.toggleWishlistAction).toHaveBeenCalledWith('prod-existing', false)
    )
  })

  it('reverts the optimistic update when the server call fails', async () => {
    vi.mocked(Actions.toggleWishlistAction).mockResolvedValue({ error: 'not logged in' })
    const { result } = renderHook(() => useWishlist(), { wrapper })

    act(() => result.current.toggleWishlist('prod-new'))
    expect(result.current.isWishlisted('prod-new')).toBe(true)

    await waitFor(() => expect(result.current.isWishlisted('prod-new')).toBe(false))
  })
})
