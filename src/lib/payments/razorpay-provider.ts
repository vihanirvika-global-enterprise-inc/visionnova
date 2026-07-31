import { createHmac, timingSafeEqual } from 'crypto'
import { getServerRazorpay } from '@/lib/razorpay'
import type { CurrencyCode } from '@/lib/currency'
import type { CreateIntentResult, PaymentEvent, PaymentProvider } from './provider'

interface RazorpayWebhookPayload {
  event?: string
  payload?: {
    payment?: {
      entity?: {
        id?: string
        notes?: Record<string, string>
      }
    }
  }
}

export const razorpayProvider: PaymentProvider = {
  name: 'razorpay',

  async createIntent(
    amountInPaise: number,
    orderId: string,
    currency: CurrencyCode
  ): Promise<CreateIntentResult> {
    try {
      const order = await getServerRazorpay().createOrder({
        amount: amountInPaise,
        currency,
        notes: { orderId },
      })
      return { clientRef: order.id }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment setup failed'
      return { error: message }
    }
  },

  // X-Razorpay-Signature is an HMAC-SHA256 of the raw body keyed on the webhook
  // secret — a different secret from KEY_SECRET, which signs the client callback.
  verifyWebhook(rawBody: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!secret) return false

    const expected = Buffer.from(
      createHmac('sha256', secret).update(rawBody).digest('hex')
    )
    const received = Buffer.from(signature)

    // timingSafeEqual throws on length mismatch, so check first.
    if (expected.length !== received.length) return false
    return timingSafeEqual(expected, received)
  },

  parseEvent(rawBody: string): PaymentEvent {
    const body = JSON.parse(rawBody) as RazorpayWebhookPayload
    const entity = body.payload?.payment?.entity
    const identifiers = {
      orderId: entity?.notes?.orderId,
      intentId: entity?.id,
    }

    switch (body.event) {
      case 'payment.captured':
        return { type: 'payment_succeeded', ...identifiers }
      case 'payment.failed':
        return { type: 'payment_failed', ...identifiers }
      default:
        return { type: 'unhandled', ...identifiers }
    }
  },
}
