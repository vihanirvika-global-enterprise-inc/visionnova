import { withSentryConfig } from '@sentry/nextjs'
import {
  buildContentSecurityPolicy,
  sentryCspReportUri,
  CSP_REPORT_GROUP,
} from './src/lib/csp.mjs'
import { serverActionAllowedOrigins } from './src/lib/serverActionOrigins.mjs'

const isDev = process.env.NODE_ENV !== 'production'

// Violations go to Sentry's Security Header endpoint, derived from the DSN.
// Without NEXT_PUBLIC_SENTRY_DSN set, this is null and no reporting directives
// are emitted — report-only then collects nothing, which is the state the
// watch period must not be run in.
const reportUri = sentryCspReportUri(process.env.NEXT_PUBLIC_SENTRY_DSN)

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      // undefined in production — Next keeps its strict same-host CSRF check.
      // Set SERVER_ACTIONS_ALLOWED_ORIGINS (comma-separated hosts, with port)
      // when developing behind a proxy, tunnel or forwarded port.
      allowedOrigins: serverActionAllowedOrigins({
        isDev,
        port: process.env.PORT,
        extraOrigins: process.env.SERVER_ACTIONS_ALLOWED_ORIGINS,
      }),
    },
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
            key: 'Content-Security-Policy-Report-Only',
            value: buildContentSecurityPolicy({ isDev, reportUri }),
          },
          // Defines the group named by the report-to directive. Only emitted
          // alongside a real endpoint, so the header never advertises a group
          // the policy does not reference.
          ...(reportUri
            ? [
                {
                  key: 'Reporting-Endpoints',
                  value: `${CSP_REPORT_GROUP}="${reportUri}"`,
                },
              ]
            : []),
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
