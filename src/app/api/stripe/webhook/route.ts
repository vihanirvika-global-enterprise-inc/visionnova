import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getServerStripe } from '@/lib/stripe'
import { updateOrderStatus } from '@/lib/orders'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Step 1 — reject early if Stripe did not sign the request
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  // Step 2 — read raw body BEFORE any parsing
  // Stripe signature verification requires the exact bytes Stripe sent.
  // Calling .json() first re-serialises and breaks the HMAC check.
  const body = await request.text()

  // Step 3 — verify signature and parse event
  const stripe = getServerStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Webhook signature verification failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Step 4 — dispatch on event type; DB errors bubble to the outer catch
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.orderId
        if (orderId) await updateOrderStatus(orderId, 'paid')
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.orderId
        if (orderId) await updateOrderStatus(orderId, 'payment_failed')
        break
      }

      default:
        // Unhandled event — acknowledge receipt so Stripe stops retrying
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    // DB or processing failure — return 500 so Stripe retries delivery
    const message =
      err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
