import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/app/checkout/stripe-actions', () => ({ createPaymentIntent: vi.fn() }))
vi.mock('@/lib/stripe', () => ({ getServerStripe: vi.fn() }))

import { createPaymentIntent } from '@/app/checkout/stripe-actions'
import { getServerStripe } from '@/lib/stripe'
import { stripeProvider } from './stripe-provider'

const mockConstructEvent = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  vi.mocked(getServerStripe).mockReturnValue({
    webhooks: { constructEvent: mockConstructEvent },
  } as any)
})

describe('stripeProvider', () => {
  it('identifies itself as stripe', () => {
    expect(stripeProvider.name).toBe('stripe')
  })
})

describe('stripeProvider.createIntent', () => {
  // Wraps the existing action rather than reimplementing it, so Stripe behaviour
  // is unchanged by the abstraction.
  it('delegates to createPaymentIntent with amount, orderId and currency', async () => {
    vi.mocked(createPaymentIntent).mockResolvedValue({ clientSecret: 'pi_secret' })

    const result = await stripeProvider.createIntent(99900, 'order-1', 'USD')

    expect(createPaymentIntent).toHaveBeenCalledWith(99900, 'order-1', 'USD')
    expect(result).toEqual({ clientRef: 'pi_secret' })
  })

  it('passes the action error through unchanged', async () => {
    vi.mocked(createPaymentIntent).mockResolvedValue({ error: 'Card declined' })

    expect(await stripeProvider.createIntent(99900, 'order-1', 'USD')).toEqual({
      error: 'Card declined',
    })
  })
})

describe('stripeProvider.verifyWebhook', () => {
  it('returns true when constructEvent accepts the signature', () => {
    mockConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded' })
    expect(stripeProvider.verifyWebhook('{}', 'sig')).toBe(true)
  })

  it('returns false when constructEvent throws', () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('signature verification failed')
    })
    expect(stripeProvider.verifyWebhook('{}', 'sig')).toBe(false)
  })
})

describe('stripeProvider.parseEvent', () => {
  it('normalises payment_intent.succeeded to payment_succeeded', () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', metadata: { orderId: 'order-42' } } },
    })

    expect(stripeProvider.parseEvent('{}', 'sig')).toEqual({
      type: 'payment_succeeded',
      orderId: 'order-42',
      intentId: 'pi_1',
    })
  })

  it('normalises payment_intent.payment_failed to payment_failed', () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_2', metadata: { orderId: 'order-42' } } },
    })

    expect(stripeProvider.parseEvent('{}', 'sig').type).toBe('payment_failed')
  })

  it('maps unrecognised events to unhandled', () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.created',
      data: { object: {} },
    })

    expect(stripeProvider.parseEvent('{}', 'sig').type).toBe('unhandled')
  })
})
