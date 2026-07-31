// The contract both gateways honour. The webhook is the sole source of truth for
// order state: a provider's client-side callback is UX only and must never
// advance an order.

export type PaymentEventType = 'payment_succeeded' | 'payment_failed' | 'unhandled'

export interface PaymentEvent {
  type: PaymentEventType
  // Absent when the provider delivered an event we cannot tie to an order.
  // Callers must treat this as an error to report, never as a reason to guess.
  orderId?: string
  intentId?: string
}

export type CreateIntentResult =
  | { clientRef: string; error?: never }
  | { error: string; clientRef?: never }

export interface PaymentProvider {
  // clientRef is the opaque handle the browser needs to complete payment:
  // Stripe's client_secret, Razorpay's order id.
  createIntent(amountInPaise: number, orderId: string): Promise<CreateIntentResult>

  verifyWebhook(rawBody: string, signature: string): boolean

  // signature is required because Stripe's constructEvent verifies and parses in
  // one call; Razorpay parses the body directly and ignores it.
  parseEvent(rawBody: string, signature: string): PaymentEvent
}
