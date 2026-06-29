import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const { mockCapture } = vi.hoisted(() => ({ mockCapture: vi.fn() }))

vi.mock('posthog-js', () => ({
  default: {
    capture: mockCapture,
    init: vi.fn(),
  },
}))

describe('trackEvent', () => {
  beforeEach(() => { vi.clearAllMocks() })

  afterEach(() => {
    // Restore window if deleted
    if (typeof window === 'undefined') {
      vi.unstubAllGlobals()
    }
  })

  it('calls posthog.capture with correct event name and payload', async () => {
    const { trackEvent } = await import('./analytics')

    trackEvent({ event: 'add_to_cart', productId: 1, price: 999 })

    expect(mockCapture).toHaveBeenCalledWith(
      'add_to_cart',
      { event: 'add_to_cart', productId: 1, price: 999 }
    )
  })

  it('is a no-op when window is undefined', async () => {
    vi.stubGlobal('window', undefined)

    const { trackEvent } = await import('./analytics')

    expect(() =>
      trackEvent({ event: 'add_to_cart', productId: 1, price: 999 })
    ).not.toThrow()

    expect(mockCapture).not.toHaveBeenCalled()
  })
})
