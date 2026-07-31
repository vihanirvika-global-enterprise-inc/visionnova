import * as Sentry from '@sentry/nextjs'

const sharedOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
}

// Sentry.init must run inside register() so the SDK is installed before any
// instrumented module loads. Replaces sentry.server.config.ts and
// sentry.edge.config.ts, which Sentry v10 no longer picks up reliably.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init(sharedOptions)
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(sharedOptions)
  }
}
