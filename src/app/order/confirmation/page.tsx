import type { ReactNode } from 'react'
import Link from 'next/link'
import { getServerStripe } from '@/lib/stripe'
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
    <svg
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

function PaymentSuccess({ amount, paymentIntentId }: { amount: number; paymentIntentId: string }) {
  return (
    <>
      <OrderCompletedTracker orderId={paymentIntentId} total={amount / 100} />
      <svg
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
  }
}

export default async function ConfirmationPage({ searchParams }: PageProps) {
  if (!searchParams.payment_intent) {
    return <Wrapper><InvalidOrder /></Wrapper>
  }

  const stripe = getServerStripe()
  const paymentIntent = await stripe.paymentIntents.retrieve(
    searchParams.payment_intent
  )

  if (paymentIntent.status === 'succeeded') {
    return <Wrapper><PaymentSuccess amount={paymentIntent.amount} paymentIntentId={paymentIntent.id} /></Wrapper>
  }

  if (paymentIntent.status === 'processing') {
    return <Wrapper><PaymentProcessing /></Wrapper>
  }

  return <Wrapper><PaymentFailed /></Wrapper>
}
