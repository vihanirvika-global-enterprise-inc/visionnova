import { captureOrderError, type OrderErrorContext } from './sentry'

// Email is sent only after order state has already been committed. A mail
// failure at that point is not a failure of the operation, and must not be
// reported as one: a webhook that returns 500 makes the payment gateway retry
// a payment that already succeeded, indefinitely. Report it and move on.
export async function sendEmailBestEffort(
  send: () => Promise<unknown>,
  context: OrderErrorContext
): Promise<void> {
  try {
    await send()
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    captureOrderError(error, context)
    // Also to the server log. Sentry is a no-op with no DSN configured, which
    // is exactly the state a deployment with a broken mail provider tends to
    // be in — without this the only trace of a failed send is its absence.
    console.error('[email] best-effort send failed:', context, error)
  }
}
