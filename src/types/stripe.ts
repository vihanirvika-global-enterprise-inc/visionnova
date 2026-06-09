// Discriminated union returned by createPaymentIntent server action.
// On the client: if (result.clientSecret) { /* success */ }
//               if (result.error)        { /* failure */ }
export type PaymentIntentResult =
  | { clientSecret: string; error?: never }
  | { error: string; clientSecret?: never }

// Mirrors Stripe's PaymentIntent.status — used in Step 4 (confirmation page)
// when calling stripe.paymentIntents.retrieve() and branching on status.
export type StripePaymentStatus =
  | 'succeeded'
  | 'processing'
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'canceled'

// Checkout UI state machine — drives CheckoutForm.tsx in Step 3.
// Typed here to prevent string typos and make transitions explicit.
export type CheckoutStep =
  | 'address'      // user filling shipping form
  | 'payment'      // Stripe Elements rendered, awaiting card input
  | 'processing'   // confirmPayment() in flight
  | 'confirmed'    // payment succeeded, order created
  | 'error'        // payment failed or server error
