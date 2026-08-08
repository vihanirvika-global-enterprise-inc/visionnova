import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerStripe } from '@/lib/stripe'
import { getServerRazorpay } from '@/lib/razorpay'
import { getSession } from '@/lib/session'
import { getOrderById } from '@/lib/orders'
import { isUuid } from '@/lib/uuid'
import { formatPrice } from '@/lib/formatters'
import { OrderCompletedTracker } from './OrderCompletedTracker'

// ── Shared layout wrapper ─────────────────────────────────────────────────────

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center text-center gap-4">
        {children}
      </div>
    </main>
  )
}

// ── Shared icon primitives ────────────────────────────────────────────────────

function RedXIcon() {
  return (
    <svg aria-hidden="true"
      data-testid="error-icon"
      className="h-16 w-16 text-red-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InvalidOrder() {
  return (
    <>
      <RedXIcon />
      <h1 className="text-2xl font-bold text-dark">Something Went Wrong</h1>
      <p className="text-muted text-center max-w-md">
        We couldn&apos;t find your order. Please contact support if you were charged.
      </p>
      <div className="flex gap-3 mt-4">
        <Link href="/shop" className="btn-primary">Return to Shop</Link>
        <Link href="/help" className="btn-secondary">Contact Support</Link>
      </div>
    </>
  )
}

function PaymentSuccess({ amount, orderReference }: { amount: number; orderReference: string }) {
  return (
    <>
      <OrderCompletedTracker orderId={orderReference} total={amount / 100} />
      <svg aria-hidden="true"
        data-testid="success-icon"
        className="h-16 w-16 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h1 className="text-2xl font-bold text-dark">Order Confirmed!</h1>
      <p className="text-primary font-bold text-xl">{formatPrice(amount / 100)}</p>
      <p className="text-muted text-center max-w-md">
        Thank you for your order. Our optometrists will verify your prescription within 12 hours.
      </p>
      <div className="card p-4 bg-surface mt-6 max-w-md w-full text-left">
        <p className="font-semibold text-dark mb-3">What happens next?</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
          <li>Prescription verified by licensed optometrist</li>
          <li>Lenses cut and fitted to your frames</li>
          <li>Order dispatched with tracking number via email</li>
        </ol>
      </div>
      {/* TODO (A11): the mockup offered a "Download invoice" button. Not
          built — there is no invoice generator anywhere in this repo, no PDF
          dependency, and no invoice number series. A GST invoice is a
          statutory document under the CGST Rules: it needs the seller's GSTIN
          (still TODO in the footer), a sequential invoice number, HSN codes
          and a tax breakdown. A button producing anything less would be worse
          than none, and inventing the numbers is not an option. Bundled with
          the registered-entity details on the schema/compliance backlog. */}
      <Link href="/account" className="btn-primary mt-6">Track Your Order</Link>
      <Link href="/shop" className="btn-secondary mt-2">Continue Shopping</Link>
    </>
  )
}

function PaymentProcessing() {
  return (
    <>
      <div className="border-4 border-primary border-t-transparent rounded-full w-12 h-12 animate-spin" />
      <h1 className="text-2xl font-bold text-dark">Payment Processing</h1>
      <p className="text-muted text-center max-w-md">
        We&apos;ll email you when confirmed and your order is placed.
      </p>
      <p className="text-sm text-muted">This usually takes less than a minute.</p>
      <Link href="/account" className="btn-secondary mt-6">View My Account</Link>
    </>
  )
}

function PaymentFailed() {
  return (
    <>
      <RedXIcon />
      <h1 className="text-2xl font-bold text-dark">Payment Failed</h1>
      <p className="text-muted text-center max-w-md">
        Your payment could not be processed. No charge was made to your account.
      </p>
      <Link href="/checkout" className="btn-primary mt-6">Return to Checkout</Link>
      <Link href="/checkout" className="btn-secondary mt-2">Try Different Card</Link>
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: {
    payment_intent?: string
    payment_intent_client_secret?: string
    redirect_status?: string
    razorpay_payment_id?: string
  }
}

// The provider identifier in the URL only ever proves which payment the
// browser was redirected for — never who it belongs to. notFound() rather
// than a 403 for every failure: confirming that someone else's order exists
// is itself a disclosure. Same reasoning as order/[id]/page.tsx.
async function assertOwnership(orderId: string | undefined) {
  const session = getSession()

  // orders.id is a uuid column. This id is not a path segment — it comes back
  // from Stripe metadata or Razorpay notes — but it still reaches the query
  // unvalidated, so a payment carrying a malformed or legacy reference threw
  // `invalid input syntax for type uuid` and 500'd the confirmation page for a
  // customer who had just been charged. Same guard as /order/[id] and the PDP.
  const resolvable = Boolean(session && orderId && isUuid(orderId))
  const order = resolvable ? await getOrderById(orderId as string) : null

  if (!session || !order || order.customerId !== session.customerId) {
    notFound()
  }
}

// The try/catch wraps ONLY the provider lookup, never the ownership check
// below it. notFound() travels as a thrown error, so a catch placed around the
// whole render would swallow it and turn someone else's order into a
// successful confirmation — the same class of mistake that made the PDP serve
// 200s for missing products. Scoping the catch this tightly means the
// not-found signal is never in its path at all, which is stronger than
// re-throwing on inspection.
async function resolvePayment<T>(lookup: () => Promise<T>): Promise<T | null> {
  try {
    return await lookup()
  } catch {
    // A stale, mistyped or replayed id, or an unconfigured provider client.
    // Either way we cannot confirm anything, and the customer may have been
    // charged — InvalidOrder says exactly that.
    return null
  }
}

// Razorpay's client-side handler only ever runs on success, so its redirect is
// UX only — this looks the payment up against Razorpay's own API rather than
// trusting the fact that the id is present in the URL.
async function renderRazorpayResult(paymentId: string) {
  const payment = await resolvePayment(() => getServerRazorpay().fetchPayment(paymentId))
  if (!payment) {
    return <Wrapper><InvalidOrder /></Wrapper>
  }

  await assertOwnership(payment.notes?.orderId)

  if (payment.status === 'captured') {
    return <Wrapper><PaymentSuccess amount={payment.amount} orderReference={payment.id} /></Wrapper>
  }

  if (payment.status === 'created' || payment.status === 'authorized') {
    return <Wrapper><PaymentProcessing /></Wrapper>
  }

  return <Wrapper><PaymentFailed /></Wrapper>
}

async function renderStripeResult(paymentIntentId: string) {
  const paymentIntent = await resolvePayment(() =>
    getServerStripe().paymentIntents.retrieve(paymentIntentId)
  )
  if (!paymentIntent) {
    return <Wrapper><InvalidOrder /></Wrapper>
  }

  await assertOwnership(paymentIntent.metadata?.orderId)

  if (paymentIntent.status === 'succeeded') {
    return <Wrapper><PaymentSuccess amount={paymentIntent.amount} orderReference={paymentIntent.id} /></Wrapper>
  }

  if (paymentIntent.status === 'processing') {
    return <Wrapper><PaymentProcessing /></Wrapper>
  }

  return <Wrapper><PaymentFailed /></Wrapper>
}

export default async function ConfirmationPage({ searchParams }: PageProps) {
  if (searchParams.razorpay_payment_id) {
    return renderRazorpayResult(searchParams.razorpay_payment_id)
  }

  if (!searchParams.payment_intent) {
    return <Wrapper><InvalidOrder /></Wrapper>
  }

  return renderStripeResult(searchParams.payment_intent)
}
