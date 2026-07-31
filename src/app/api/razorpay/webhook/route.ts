import { NextRequest, NextResponse } from 'next/server'
import { razorpayProvider } from '@/lib/payments/razorpay-provider'
import { updateOrderStatus } from '@/lib/orders'
import { getCustomerById } from '@/lib/customers'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { captureOrderError } from '@/lib/sentry'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Step 1 — reject early if Razorpay did not sign the request
  const signature = request.headers.get('x-razorpay-signature')
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing x-razorpay-signature header' },
      { status: 400 }
    )
  }

  // Step 2 — read raw body BEFORE any parsing
  // The HMAC is computed over the exact bytes Razorpay sent; parsing first
  // re-serialises and breaks the check.
  const body = await request.text()

  // Step 3 — verify signature
  if (!razorpayProvider.verifyWebhook(body, signature)) {
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // Step 4 — dispatch on the normalised event; DB errors bubble to the outer catch
  const event = razorpayProvider.parseEvent(body, signature)
  const currentOrderId = event.orderId

  try {
    switch (event.type) {
      case 'payment_succeeded': {
        if (!currentOrderId) {
          // Payment captured but we cannot resolve the order — the notes thread
          // is broken upstream. Acknowledge so Razorpay stops retrying, but
          // surface it: silently dropping this leaves a paid customer with no order.
          captureOrderError(
            new Error('payment.captured has no notes.orderId'),
            { paymentIntentId: event.intentId }
          )
          break
        }
        const order = await updateOrderStatus(currentOrderId, 'paid')
        const customer = await getCustomerById(order.customerId)
        if (customer) {
          await sendOrderConfirmationEmail({
            to: customer.email,
            orderId: order.id,
            firstName: customer.firstName,
            totalAmount: order.totalAmount,
          })
        }
        break
      }

      case 'payment_failed': {
        if (currentOrderId) await updateOrderStatus(currentOrderId, 'payment_failed')
        break
      }

      default:
        // Unhandled event — acknowledge receipt so Razorpay stops retrying
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    // DB or processing failure — report to Sentry then return 500 so Razorpay retries delivery
    captureOrderError(
      err instanceof Error ? err : new Error(String(err)),
      { orderId: currentOrderId }
    )
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
