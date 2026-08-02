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

export function captureAuthWarning(error: Error, context: { check?: string } = {}) {
  Sentry.captureException(error, { extra: context })
}

// Deliberately louder than captureAuthWarning: this fires when rate limiting
// is failing open, meaning register/login are currently unprotected against
// brute-force/credential-stuffing. That's an actionable incident, not a
// routine degraded-dependency blip — level 'fatal' and a dedicated tag so an
// alert rule can page on it distinctly, instead of it scrolling past in a
// stream of ordinary warnings.
export function captureRateLimitOutage(
  error: Error,
  context: { key?: string; reason?: string } = {}
) {
  Sentry.captureException(error, {
    level: 'fatal',
    tags: { alert: 'rate-limit-outage' },
    extra: context,
  })
}
