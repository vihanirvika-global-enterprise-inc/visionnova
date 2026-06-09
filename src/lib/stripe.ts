import { loadStripe } from '@stripe/stripe-js'
import type Stripe from 'stripe'

// ── Client-side ───────────────────────────────────────────────────────────────
// Safe to import in any component. Pass to <Elements stripe={stripePromise}>.
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

// ── Server-side ───────────────────────────────────────────────────────────────
// Lazy singleton — only initialised in Node.js environment.
// The type guard (typeof window check) ensures STRIPE_SECRET_KEY is never
// read in a browser context. require() inside the function body prevents the
// stripe Node SDK from entering Next.js client bundles via static analysis.
let _stripe: Stripe | undefined

export function getServerStripe(): Stripe {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getServerStripe() is server-only. Use stripePromise for client-side Stripe.'
    )
  }
  if (!_stripe) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StripeConstructor = require('stripe') as new (key: string) => Stripe
    _stripe = new StripeConstructor(process.env.STRIPE_SECRET_KEY!)
  }
  return _stripe
}
