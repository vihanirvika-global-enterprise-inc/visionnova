import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getServerStripe } from '@/lib/stripe'
import { updateOrderStatus } from '@/lib/orders'
import { getCustomerById } from '@/lib/customers'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { sendEmailBestEffort } from '@/lib/bestEffortEmail'
import { captureOrderError } from '@/lib/sentry'

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
  let currentOrderId: string | undefined
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.orderId
        currentOrderId = orderId
        if (!orderId) {
          // Payment succeeded but we cannot resolve the order — the metadata thread
          // is broken upstream. Acknowledge so Stripe stops retrying, but surface it:
          // silently dropping this would leave a paid customer with no order.
          captureOrderError(
            new Error('payment_intent.succeeded has no metadata.orderId'),
            { paymentIntentId: pi.id }
          )
          break
        }
        const order = await updateOrderStatus(orderId, 'paid')
        const customer = await getCustomerById(order.customerId)
        if (customer) {
          await sendEmailBestEffort(
            () =>
              sendOrderConfirmationEmail({
                to: customer.email,
                orderId: order.id,
                firstName: customer.firstName,
                totalAmount: order.totalAmount,
              }),
            { orderId: order.id }
          )
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.orderId
        currentOrderId = orderId
        if (orderId) await updateOrderStatus(orderId, 'payment_failed')
        break
      }

      default:
        // Unhandled event — acknowledge receipt so Stripe stops retrying
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    // DB or processing failure — report to Sentry then return 500 so Stripe retries delivery
    captureOrderError(
      err instanceof Error ? err : new Error(String(err)),
      { orderId: currentOrderId }
    )
    const message =
      err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
