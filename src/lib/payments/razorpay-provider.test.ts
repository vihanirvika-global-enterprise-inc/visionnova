import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'

vi.mock('@/lib/razorpay', () => ({ getServerRazorpay: vi.fn() }))

import { getServerRazorpay } from '@/lib/razorpay'
import { razorpayProvider } from './razorpay-provider'

const WEBHOOK_SECRET = 'test_webhook_secret'
const ORIGINAL_ENV = { ...process.env }

function sign(body: string, secret = WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

function capturedEvent(orderId?: string): string {
  return JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_123',
          notes: orderId ? { orderId } : {},
        },
      },
    },
  })
}

let mockCreateOrder: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
  mockCreateOrder = vi.fn()
  vi.mocked(getServerRazorpay).mockReturnValue({ createOrder: mockCreateOrder } as any)
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('razorpayProvider', () => {
  it('identifies itself as razorpay', () => {
    expect(razorpayProvider.name).toBe('razorpay')
  })
})

describe('razorpayProvider.createIntent', () => {
  it('threads orderId into notes and keeps amount as integer paise', async () => {
    mockCreateOrder.mockResolvedValue({ id: 'order_rzp_1' })

    const result = await razorpayProvider.createIntent(99900, 'order-1', 'INR')

    expect(mockCreateOrder).toHaveBeenCalledWith({
      amount: 99900,
      currency: 'INR',
      notes: { orderId: 'order-1' },
    })
    expect(result).toEqual({ clientRef: 'order_rzp_1' })
  })

  it('returns { error } when order creation fails', async () => {
    mockCreateOrder.mockRejectedValue(new Error('Razorpay is down'))

    expect(await razorpayProvider.createIntent(99900, 'order-1', 'INR')).toEqual({
      error: 'Razorpay is down',
    })
  })
})

describe('razorpayProvider.verifyWebhook', () => {
  it('accepts a body signed with the webhook secret', () => {
    const body = capturedEvent('order-42')
    expect(razorpayProvider.verifyWebhook(body, sign(body))).toBe(true)
  })

  // KEY_SECRET signs the client callback; the webhook is signed with a different
  // secret. Using the wrong one must fail closed.
  it('rejects a body signed with the wrong secret', () => {
    const body = capturedEvent('order-42')
    expect(razorpayProvider.verifyWebhook(body, sign(body, 'key_secret'))).toBe(false)
  })

  it('rejects a tampered body', () => {
    const signature = sign(capturedEvent('order-42'))
    expect(razorpayProvider.verifyWebhook(capturedEvent('order-99'), signature)).toBe(false)
  })

  it('rejects a malformed signature without throwing', () => {
    const body = capturedEvent('order-42')
    expect(razorpayProvider.verifyWebhook(body, 'not-hex')).toBe(false)
    expect(razorpayProvider.verifyWebhook(body, '')).toBe(false)
  })
})

describe('razorpayProvider.parseEvent', () => {
  // The signature argument exists for Stripe, whose constructEvent verifies and
  // parses in one call. Razorpay parses the body directly and ignores it.
  it('normalises payment.captured to payment_succeeded and lifts notes.orderId', () => {
    const body = capturedEvent('order-42')
    expect(razorpayProvider.parseEvent(body, sign(body))).toEqual({
      type: 'payment_succeeded',
      orderId: 'order-42',
      intentId: 'pay_123',
    })
  })

  it('normalises payment.failed to payment_failed', () => {
    const body = JSON.stringify({
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_456', notes: { orderId: 'order-42' } } } },
    })

    expect(razorpayProvider.parseEvent(body, sign(body))).toEqual({
      type: 'payment_failed',
      orderId: 'order-42',
      intentId: 'pay_456',
    })
  })

  it('reports an absent orderId as undefined rather than guessing', () => {
    const body = capturedEvent()
    expect(razorpayProvider.parseEvent(body, sign(body))).toEqual({
      type: 'payment_succeeded',
      orderId: undefined,
      intentId: 'pay_123',
    })
  })

  it('maps unrecognised events to unhandled', () => {
    const body = JSON.stringify({
      event: 'refund.created',
      payload: { payment: { entity: { id: 'pay_789', notes: {} } } },
    })

    expect(razorpayProvider.parseEvent(body, sign(body)).type).toBe('unhandled')
  })
})
