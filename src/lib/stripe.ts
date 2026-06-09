// SERVER ONLY — never import client-side
// To enforce at build time: npm install server-only && add import 'server-only' here

import { loadStripe } from '@stripe/stripe-js'
import type Stripe from 'stripe'

// ── Server-side ───────────────────────────────────────────────────────────────
let stripeInstance: Stripe | null = null

export function getServerStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. ' +
      'Add it to .env.local for development or ' +
      'environment variables for production.'
    )
  }
  if (!stripeInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StripeConstructor = require('stripe') as new (
      key: string,
      options?: Record<string, unknown>
    ) => Stripe
    stripeInstance = new StripeConstructor(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
      typescript: true,
    })
  }
  return stripeInstance
}

// Exported for test teardown only — resets the lazy singleton so tests don't leak state
export function _resetStripeInstance(): void {
  stripeInstance = null
}

// ── Client-side ───────────────────────────────────────────────────────────────
let _stripePromise: ReturnType<typeof loadStripe> | null = null

export function getClientStripe() {
  if (!_stripePromise) {
    _stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    )
  }
  return _stripePromise
}
