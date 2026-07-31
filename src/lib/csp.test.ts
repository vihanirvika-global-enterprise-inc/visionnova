import { describe, it, expect } from 'vitest'
import { buildContentSecurityPolicy, sentryCspReportUri } from './csp.mjs'

function directive(policy: string, name: string): string {
  const found = policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `))
  return found ?? ''
}

describe('buildContentSecurityPolicy', () => {
  const policy = buildContentSecurityPolicy({ isDev: false })

  it('defaults to self', () => {
    expect(directive(policy, 'default-src')).toContain("'self'")
  })

  // Razorpay Checkout is a script loaded from their CDN that opens a payment
  // iframe — both hosts have to be allowed or the modal never renders.
  it('allows the Razorpay Checkout script', () => {
    expect(directive(policy, 'script-src')).toContain('https://checkout.razorpay.com')
  })

  it('allows the Razorpay payment frame', () => {
    const frames = directive(policy, 'frame-src')
    expect(frames).toContain('https://api.razorpay.com')
    expect(frames).toContain('https://checkout.razorpay.com')
  })

  it('allows calls to the Razorpay API', () => {
    expect(directive(policy, 'connect-src')).toContain('https://*.razorpay.com')
  })

  // Regression guard: the app already depended on these before any CSP existed,
  // so a first policy that omits them breaks payments and observability silently.
  it('does not break Stripe', () => {
    expect(directive(policy, 'script-src')).toContain('https://js.stripe.com')
    expect(directive(policy, 'frame-src')).toContain('https://js.stripe.com')
    expect(directive(policy, 'connect-src')).toContain('https://api.stripe.com')
  })

  it('does not break Sentry or PostHog reporting', () => {
    const connect = directive(policy, 'connect-src')
    expect(connect).toContain('https://*.sentry.io')
    expect(connect).toContain('https://*.posthog.com')
  })

  it('blocks object embedding and framing of this app', () => {
    expect(directive(policy, 'object-src')).toContain("'none'")
    expect(directive(policy, 'frame-ancestors')).toContain("'none'")
  })

  it('emits a single-line header value', () => {
    expect(policy).not.toContain('\n')
  })
})

describe('buildContentSecurityPolicy in development', () => {
  // Next.js dev tooling (React Refresh, error overlay) evaluates code at runtime.
  it("allows 'unsafe-eval' only in development", () => {
    expect(directive(buildContentSecurityPolicy({ isDev: true }), 'script-src')).toContain(
      "'unsafe-eval'"
    )
    expect(directive(buildContentSecurityPolicy({ isDev: false }), 'script-src')).not.toContain(
      "'unsafe-eval'"
    )
  })
})

// Without a reporting endpoint, a report-only policy sends violations to each
// visitor's console and nowhere else — the watch period would observe nothing.
describe('sentryCspReportUri', () => {
  it("derives Sentry's security-header endpoint from a DSN", () => {
    expect(sentryCspReportUri('https://abc123@o12345.ingest.sentry.io/456')).toBe(
      'https://o12345.ingest.sentry.io/api/456/security/?sentry_key=abc123'
    )
  })

  it('preserves a path prefix on self-hosted Sentry', () => {
    expect(sentryCspReportUri('https://key@sentry.example.com/prefix/789')).toBe(
      'https://sentry.example.com/prefix/api/789/security/?sentry_key=key'
    )
  })

  it('returns null when no DSN is configured', () => {
    expect(sentryCspReportUri(undefined)).toBeNull()
    expect(sentryCspReportUri('')).toBeNull()
  })

  it('returns null rather than throwing on a malformed DSN', () => {
    expect(sentryCspReportUri('not-a-url')).toBeNull()
    expect(sentryCspReportUri('https://o12345.ingest.sentry.io/456')).toBeNull() // no public key
    expect(sentryCspReportUri('https://key@host/')).toBeNull() // no project id
  })
})

describe('buildContentSecurityPolicy reporting', () => {
  const REPORT_URI = 'https://o1.ingest.sentry.io/api/2/security/?sentry_key=k'

  it('names both report-uri and report-to when an endpoint is configured', () => {
    const policy = buildContentSecurityPolicy({ isDev: false, reportUri: REPORT_URI })

    expect(directive(policy, 'report-uri')).toContain(REPORT_URI)
    // report-uri is deprecated but still the only one several browsers honour;
    // report-to is the replacement. Emitting both maximises collection.
    expect(directive(policy, 'report-to')).toContain('csp-endpoint')
  })

  it('emits no reporting directives when there is no endpoint', () => {
    const policy = buildContentSecurityPolicy({ isDev: false })

    expect(policy).not.toContain('report-uri')
    expect(policy).not.toContain('report-to')
  })

  it('leaves the protective directives unchanged', () => {
    const policy = buildContentSecurityPolicy({ isDev: false, reportUri: REPORT_URI })

    expect(directive(policy, 'default-src')).toContain("'self'")
    expect(directive(policy, 'frame-ancestors')).toContain("'none'")
    expect(directive(policy, 'script-src')).toContain('https://checkout.razorpay.com')
  })

  it('stays a single-line header value', () => {
    expect(buildContentSecurityPolicy({ isDev: false, reportUri: REPORT_URI })).not.toContain('\n')
  })
})
