import * as Sentry from '@sentry/nextjs'

export function captureOrderError(
  error: Error,
  context: { orderId?: string; userId?: string }
) {
  Sentry.captureException(error, { extra: context })
}

export function capturePaymentError(
  error: Error,
  context: { paymentIntentId?: string; amount?: number }
) {
  Sentry.captureException(error, { extra: context })
}
