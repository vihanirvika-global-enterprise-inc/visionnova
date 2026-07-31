import { withSentryConfig } from '@sentry/nextjs'
import { buildContentSecurityPolicy } from './src/lib/csp.mjs'

const isDev = process.env.NODE_ENV !== 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // REPORT-ONLY during the initial watch period: violations are
            // reported by the browser but nothing is blocked. This is the app's
            // first CSP, and it covers four third parties already in production
            // traffic (Stripe, Razorpay, Sentry, PostHog) — going straight to
            // enforcing risks discovering a missed host from customers rather
            // than from a report.
            //
            // TO ENFORCE: change this key to 'Content-Security-Policy' once the
            // watch period passes with no unexpected violations. Nothing else
            // needs to change; the policy value is already the one to enforce.
            //
            // Note: with no report-uri/report-to endpoint configured, violations
            // surface only in the browser console. Wire up a reporting endpoint
            // before relying on this to catch anything.
            key: 'Content-Security-Policy-Report-Only',
            value: buildContentSecurityPolicy({ isDev }),
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
})
