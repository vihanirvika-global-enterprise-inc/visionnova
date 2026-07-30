import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/stripe', () => ({
  getServerStripe: vi.fn(),
  stripePromise: null,
}))

import { getServerStripe } from '@/lib/stripe'

describe('createPaymentIntent', () => {
  let mockCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate = vi.fn()
    vi.mocked(getServerStripe).mockReturnValue({
      paymentIntents: { create: mockCreate },
    } as any)
  })

  it('returns clientSecret when Stripe succeeds', async () => {
    mockCreate.mockResolvedValue({ client_secret: 'pi_test_secret_abc' })

    const { createPaymentIntent } = await import('./stripe-actions')
    const result = await createPaymentIntent(49900, 'order-1')

    expect(result).toEqual({ clientSecret: 'pi_test_secret_abc' })
    expect(mockCreate).toHaveBeenCalledWith({
      amount: 49900,
      currency: 'inr',
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: 'order-1', source: 'visionnova_mvp' },
    })
  })

  // The webhook resolves the order from metadata.orderId; without it no order
  // can ever advance to paid.
  it('puts orderId in metadata alongside source', async () => {
    mockCreate.mockResolvedValue({ client_secret: 'pi_test_secret_abc' })

    const { createPaymentIntent } = await import('./stripe-actions')
    await createPaymentIntent(49900, 'order-xyz')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { orderId: 'order-xyz', source: 'visionnova_mvp' },
      })
    )
  })

  it('passes the amount through unchanged as integer paise', async () => {
    mockCreate.mockResolvedValue({ client_secret: 'pi_test_secret_abc' })

    const { createPaymentIntent } = await import('./stripe-actions')
    await createPaymentIntent(99999, 'order-1')

    const [{ amount }] = mockCreate.mock.calls[0]
    expect(amount).toBe(99999)
    expect(Number.isInteger(amount)).toBe(true)
  })

  it('returns { error } when Stripe throws', async () => {
    mockCreate.mockRejectedValue(new Error('Your card was declined'))

    const { createPaymentIntent } = await import('./stripe-actions')
    const result = await createPaymentIntent(49900, 'order-1')

    expect(result).toEqual({ error: 'Your card was declined' })
  })
})

describe('formatAmountForStripe', () => {
  it('converts whole rupees to paise', async () => {
    const { formatAmountForStripe } = await import('@/lib/formatters')
    expect(formatAmountForStripe(499)).toBe(49900)
  })

  it('rounds fractional rupees to integer paise (no decimal paise)', async () => {
    const { formatAmountForStripe } = await import('@/lib/formatters')
    expect(formatAmountForStripe(499.99)).toBe(49999)
  })
})
