// Content Security Policy for the app shell.
//
// Plain .mjs rather than .ts because next.config.mjs imports it directly: Node
// reparses a .ts file as ESM on every boot and warns
// (MODULE_TYPELESS_PACKAGE_JSON). Adding "type": "module" to package.json would
// silence that too, but would break scripts/*.js, which are CommonJS.
//
// Kept out of next.config.mjs so the third-party hosts the app depends on are
// testable: this is the first CSP in the codebase, and a policy that silently
// omits Stripe, Sentry or PostHog breaks payments and observability with no
// build error.

const STRIPE_SCRIPT = 'https://js.stripe.com'
const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com'

// Analytics hosts. Both trackers are consent-gated, so these being listed
// does not mean anything loads by default — CSP is not the control that
// prevents collection, consent is. They are listed so that switching this
// policy from Report-Only to enforcing does not silently break analytics for
// the visitors who did agree to it.
//
// posthog-js is bundled from npm, but it fetches its recorder and surveys
// bundles from the assets host at runtime, so script-src needs it too.
const POSTHOG_HOSTS = ['https://*.posthog.com', 'https://*.i.posthog.com']
const GA4_SCRIPT = 'https://www.googletagmanager.com'
const GA4_COLLECT = ['https://www.google-analytics.com', 'https://*.analytics.google.com']

// Named group referenced by the report-to directive and defined by the
// Reporting-Endpoints response header in next.config.mjs.
export const CSP_REPORT_GROUP = 'csp-endpoint'

/**
 * Sentry accepts CSP reports at its Security Header endpoint, which is derived
 * from the DSN rather than configured separately.
 *
 * DSN      https://<publicKey>@<host>/<projectId>
 * endpoint https://<host>/api/<projectId>/security/?sentry_key=<publicKey>
 *
 * @param {string | undefined} dsn
 * @returns {string | null} the endpoint, or null if no usable DSN
 */
export function sentryCspReportUri(dsn) {
  if (!dsn) return null

  try {
    const url = new URL(dsn)
    const segments = url.pathname.split('/').filter(Boolean)
    const projectId = segments.pop()

    if (!url.username || !projectId) return null

    const prefix = segments.length > 0 ? `/${segments.join('/')}` : ''
    return `${url.protocol}//${url.host}${prefix}/api/${projectId}/security/?sentry_key=${url.username}`
  } catch {
    return null
  }
}

/**
 * @param {{ isDev: boolean, reportUri?: string | null }} options
 * @returns {string} a single-line CSP header value
 */
export function buildContentSecurityPolicy({ isDev, reportUri }) {
  /** @type {Record<string, string[]>} */
  const directives = {
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
      GA4_SCRIPT,
      ...POSTHOG_HOSTS,
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
      ...POSTHOG_HOSTS,
      GA4_SCRIPT,
      ...GA4_COLLECT,
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

  // report-uri is deprecated but is still the only mechanism several browsers
  // honour; report-to is its replacement. Emitting both collects the most
  // violations. Omitted entirely when unconfigured, rather than emitting an
  // empty directive that silently drops reports.
  if (reportUri) {
    directives['report-uri'] = [reportUri]
    directives['report-to'] = [CSP_REPORT_GROUP]
  }

  return Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ')
}
