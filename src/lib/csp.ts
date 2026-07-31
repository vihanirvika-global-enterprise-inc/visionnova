// Content Security Policy for the app shell.
//
// Kept here rather than inline in next.config.mjs so the third-party hosts the
// app depends on are testable: this is the first CSP in the codebase, and a
// policy that silently omits Stripe, Sentry or PostHog breaks payments and
// observability with no build error.

interface CspOptions {
  isDev: boolean
}

const STRIPE_SCRIPT = 'https://js.stripe.com'
const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com'

export function buildContentSecurityPolicy({ isDev }: CspOptions): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],

    // 'unsafe-inline' is required by Next.js, which injects inline bootstrap
    // scripts. 'unsafe-eval' is dev-only: React Refresh and the error overlay
    // evaluate at runtime.
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      STRIPE_SCRIPT,
      RAZORPAY_SCRIPT,
    ],

    // Tailwind compiles to a stylesheet, but Next.js still injects inline styles.
    'style-src': ["'self'", "'unsafe-inline'"],

    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],

    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      'https://*.razorpay.com',
      'https://*.sentry.io',
      'https://*.posthog.com',
    ],

    // Both gateways complete payment inside an iframe they own.
    'frame-src': [
      "'self'",
      STRIPE_SCRIPT,
      'https://hooks.stripe.com',
      RAZORPAY_SCRIPT,
      'https://api.razorpay.com',
    ],

    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }

  return Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ')
}
