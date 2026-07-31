// Deliberately NOT a server action. This is reached only through
// createPayment, which enforces the serviceable-region guard first. Marking it
// 'use server' would expose a callable endpoint that creates a Stripe payment
// in any currency, bypassing that guard entirely.
import { getServerStripe } from '@/lib/stripe'
import type { CurrencyCode } from '@/lib/currency'
import type { PaymentIntentResult } from '@/types/stripe'

export type { PaymentIntentResult }

export async function createPaymentIntent(
  amountInPaise: number,
  orderId: string,
  currency: CurrencyCode
): Promise<PaymentIntentResult> {
  try {
    const stripe = getServerStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      // Stripe expects a lowercase ISO-4217 code.
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: { orderId, source: 'visionnova_mvp' },
    })

    const clientSecret = paymentIntent.client_secret
    if (!clientSecret) {
      return { error: 'Payment setup failed: no client secret returned' }
    }
    return { clientSecret }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment setup failed'
    return { error: message }
  }
}
