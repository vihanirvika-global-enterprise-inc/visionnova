import { describe, it, expect } from 'vitest'
import { buildContentSecurityPolicy } from './csp'

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
