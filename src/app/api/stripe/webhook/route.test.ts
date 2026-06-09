import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/stripe', () => ({
  getServerStripe: vi.fn(),
}))
vi.mock('@/lib/orders', () => ({
  updateOrderStatus: vi.fn(),
}))

import { getServerStripe } from '@/lib/stripe'
import { updateOrderStatus } from '@/lib/orders'
import { POST } from './route'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Shared mock for stripe.webhooks.constructEvent — configured per test
const mockConstructEvent = vi.fn()

function makeWebhookRequest(body: string, signature?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (signature) headers['stripe-signature'] = signature
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers,
    body,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerStripe).mockReturnValue({
    webhooks: { constructEvent: mockConstructEvent },
  } as any)
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/stripe/webhook', () => {
  it('returns 400 if stripe-signature header is missing', async () => {
    const request = makeWebhookRequest(JSON.stringify({})) // no signature arg
    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/missing stripe-signature/i)
  })

  it('returns 400 if constructEvent throws (signature verification failed)', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Webhook signature verification failed')
    })

    const request = makeWebhookRequest(JSON.stringify({}), 'test_sig_bad')
    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/signature verification failed/i)
  })

  it('handles payment_intent.succeeded — calls updateOrderStatus with paid', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_123', metadata: { orderId: '42' } } },
    })
    vi.mocked(updateOrderStatus).mockResolvedValue({} as any)

    const request = makeWebhookRequest(JSON.stringify({}), 'test_sig_ok')
    const response = await POST(request)

    expect(updateOrderStatus).toHaveBeenCalledWith('42', 'paid')
    expect(response.status).toBe(200)
  })

  it('handles payment_intent.payment_failed — calls updateOrderStatus with payment_failed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_test_456', metadata: { orderId: '42' } } },
    })
    vi.mocked(updateOrderStatus).mockResolvedValue({} as any)

    const request = makeWebhookRequest(JSON.stringify({}), 'test_sig_ok')
    const response = await POST(request)

    expect(updateOrderStatus).toHaveBeenCalledWith('42', 'payment_failed')
    expect(response.status).toBe(200)
  })

  it('returns 200 for unhandled event types without calling updateOrderStatus', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.created',
      data: { object: {} },
    })

    const request = makeWebhookRequest(JSON.stringify({}), 'test_sig_ok')
    const response = await POST(request)

    expect(updateOrderStatus).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })

  it('returns 500 if updateOrderStatus throws', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_err', metadata: { orderId: '42' } } },
    })
    vi.mocked(updateOrderStatus).mockRejectedValue(new Error('DB connection failed'))

    const request = makeWebhookRequest(JSON.stringify({}), 'test_sig_ok')
    const response = await POST(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toMatch(/DB connection failed/i)
  })
})
