import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

vi.mock('@/lib/orders', () => ({ updateOrderStatus: vi.fn() }))
vi.mock('@/lib/customers', () => ({ getCustomerById: vi.fn() }))
vi.mock('@/lib/email', () => ({ sendOrderConfirmationEmail: vi.fn() }))
vi.mock('@/lib/sentry', () => ({ captureOrderError: vi.fn() }))

import { updateOrderStatus } from '@/lib/orders'
import { getCustomerById } from '@/lib/customers'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { captureOrderError } from '@/lib/sentry'
import { POST } from './route'

const WEBHOOK_SECRET = 'test_webhook_secret'
const ORIGINAL_ENV = { ...process.env }

function sign(body: string, secret = WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

function eventBody(event: string, orderId?: string, paymentId = 'pay_123'): string {
  return JSON.stringify({
    event,
    payload: {
      payment: { entity: { id: paymentId, notes: orderId ? { orderId } : {} } },
    },
  })
}

function makeWebhookRequest(body: string, signature?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (signature) headers['x-razorpay-signature'] = signature
  return new NextRequest('http://localhost/api/razorpay/webhook', {
    method: 'POST',
    headers,
    body,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('POST /api/razorpay/webhook', () => {
  it('returns 400 if x-razorpay-signature header is missing', async () => {
    const response = await POST(makeWebhookRequest(eventBody('payment.captured', '42')))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/missing x-razorpay-signature/i)
    expect(updateOrderStatus).not.toHaveBeenCalled()
  })

  it('returns 400 if the signature does not verify', async () => {
    const body = eventBody('payment.captured', '42')
    const response = await POST(makeWebhookRequest(body, sign(body, 'wrong_secret')))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/signature verification failed/i)
    expect(updateOrderStatus).not.toHaveBeenCalled()
  })

  it('advances the order to paid on payment.captured', async () => {
    const body = eventBody('payment.captured', '42')
    vi.mocked(updateOrderStatus).mockResolvedValue({} as any)

    const response = await POST(makeWebhookRequest(body, sign(body)))

    expect(updateOrderStatus).toHaveBeenCalledWith('42', 'paid')
    expect(response.status).toBe(200)
  })

  it('sends the confirmation email after payment.captured', async () => {
    const body = eventBody('payment.captured', 'order-42')
    vi.mocked(updateOrderStatus).mockResolvedValue({
      id: 'order-42',
      customerId: 'customer-1',
      totalAmount: 149.99,
      status: 'paid',
      shippingAddress: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(getCustomerById).mockResolvedValue({
      id: 'customer-1',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      passwordHash: '',
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const response = await POST(makeWebhookRequest(body, sign(body)))

    expect(sendOrderConfirmationEmail).toHaveBeenCalledWith({
      to: 'jane@example.com',
      orderId: 'order-42',
      firstName: 'Jane',
      totalAmount: 149.99,
    })
    expect(response.status).toBe(200)
  })

  // The order is already committed by the time the email is attempted. Returning
  // 500 here makes Razorpay retry a payment that succeeded, forever.
  it('returns 200 when the confirmation email fails, and reports it', async () => {
    const body = eventBody('payment.captured', 'order-42')
    vi.mocked(updateOrderStatus).mockResolvedValue({
      id: 'order-42',
      customerId: 'customer-1',
      totalAmount: 149.99,
      status: 'paid',
      shippingAddress: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(getCustomerById).mockResolvedValue({
      id: 'customer-1',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'customer',
      passwordHash: '',
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
    vi.mocked(sendOrderConfirmationEmail).mockRejectedValue(new Error('Missing API key'))

    const response = await POST(makeWebhookRequest(body, sign(body)))

    expect(response.status).toBe(200)
    expect(updateOrderStatus).toHaveBeenCalledWith('order-42', 'paid')
    expect(captureOrderError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ orderId: 'order-42' })
    )
  })

  it('marks the order payment_failed on payment.failed', async () => {
    const body = eventBody('payment.failed', '42')
    vi.mocked(updateOrderStatus).mockResolvedValue({} as any)

    const response = await POST(makeWebhookRequest(body, sign(body)))

    expect(updateOrderStatus).toHaveBeenCalledWith('42', 'payment_failed')
    expect(response.status).toBe(200)
  })

  it('returns 200 for unhandled events without touching the order', async () => {
    const body = eventBody('refund.created', '42')

    const response = await POST(makeWebhookRequest(body, sign(body)))

    expect(updateOrderStatus).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })

  it('returns 200 and reports to Sentry when notes.orderId is missing', async () => {
    const body = eventBody('payment.captured', undefined, 'pay_no_order')

    const response = await POST(makeWebhookRequest(body, sign(body)))

    expect(response.status).toBe(200)
    expect(updateOrderStatus).not.toHaveBeenCalled()
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled()
    expect(captureOrderError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ paymentIntentId: 'pay_no_order' })
    )
  })

  // 500 so Razorpay retries delivery, matching the Stripe route.
  it('returns 500 and reports to Sentry when the order update throws', async () => {
    const body = eventBody('payment.captured', 'does-not-exist')
    vi.mocked(updateOrderStatus).mockRejectedValue(new Error('Order not found'))

    const response = await POST(makeWebhookRequest(body, sign(body)))

    expect(response.status).toBe(500)
    expect((await response.json()).error).toMatch(/order not found/i)
    expect(captureOrderError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ orderId: 'does-not-exist' })
    )
  })
})
