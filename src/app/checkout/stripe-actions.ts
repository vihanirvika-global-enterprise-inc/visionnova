'use server'

import { getServerStripe } from '@/lib/stripe'
import type { PaymentIntentResult } from '@/types/stripe'

export type { PaymentIntentResult }

export async function createPaymentIntent(
  amountInPaise: number,
  orderId: string
): Promise<PaymentIntentResult> {
  try {
    const stripe = getServerStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      currency: 'inr',
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
