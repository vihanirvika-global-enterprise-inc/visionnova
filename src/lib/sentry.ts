import * as Sentry from '@sentry/nextjs'

// A type alias, not an interface: Sentry's `extra` expects a Record, and only
// type aliases get an implicit index signature.
export type OrderErrorContext = {
  orderId?: string
  userId?: string
  paymentIntentId?: string
  prescriptionId?: string
}

export function captureOrderError(error: Error, context: OrderErrorContext) {
  Sentry.captureException(error, { extra: context })
}

export function capturePaymentError(
  error: Error,
  context: { paymentIntentId?: string; amount?: number }
) {
  Sentry.captureException(error, { extra: context })
}
