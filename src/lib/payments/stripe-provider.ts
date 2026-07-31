import type Stripe from 'stripe'
import { createPaymentIntent } from '@/app/checkout/stripe-actions'
import { getServerStripe } from '@/lib/stripe'
import type { CurrencyCode } from '@/lib/currency'
import type { CreateIntentResult, PaymentEvent, PaymentProvider } from './provider'

function constructEvent(rawBody: string, signature: string): Stripe.Event {
  return getServerStripe().webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

export const stripeProvider: PaymentProvider = {
  name: 'stripe',

  // Delegates to the existing server action so Stripe behaviour is unchanged by
  // the abstraction.
  async createIntent(
    amountInPaise: number,
    orderId: string,
    currency: CurrencyCode
  ): Promise<CreateIntentResult> {
    const result = await createPaymentIntent(amountInPaise, orderId, currency)
    if (result.error) return { error: result.error }
    return { clientRef: result.clientSecret as string }
  },

  verifyWebhook(rawBody: string, signature: string): boolean {
    try {
      constructEvent(rawBody, signature)
      return true
    } catch {
      return false
    }
  },

  parseEvent(rawBody: string, signature: string): PaymentEvent {
    const event = constructEvent(rawBody, signature)
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const identifiers = {
      orderId: paymentIntent.metadata?.orderId,
      intentId: paymentIntent.id,
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        return { type: 'payment_succeeded', ...identifiers }
      case 'payment_intent.payment_failed':
        return { type: 'payment_failed', ...identifiers }
      default:
        return { type: 'unhandled', ...identifiers }
    }
  },
}
