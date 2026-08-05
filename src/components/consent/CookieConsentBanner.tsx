'use client'

import Link from 'next/link'
import { useCookieConsent } from './CookieConsentProvider'

export function CookieConsentBanner() {
  const { decision, hydrated, accept, reject } = useCookieConsent()

  // Nothing until the stored decision is known. Rendering optimistically and
  // correcting after hydration is the flash this exists to avoid, and it would
  // show the banner to people who already answered.
  if (!hydrated || decision !== null) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-heading"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white p-4 shadow-lg sm:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="cookie-consent-heading" className="text-sm font-semibold text-dark">
            Analytics cookies
          </h2>
          <p className="mt-1 text-sm text-muted">
            We&apos;d like to use analytics cookies to understand how the site is used.
            They are not needed for the site to work, and we won&apos;t set them unless
            you say yes. See our{' '}
            <Link href="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Both controls are the same size, weight and shape. A prominent
            "Accept" beside a quiet "Reject" link is not a free choice, and
            under the DPDP Act that is not valid consent. */}
        <div className="flex flex-shrink-0 gap-3">
          <button
            type="button"
            onClick={reject}
            className="flex-1 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-dark transition-colors hover:bg-surface sm:flex-none"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={accept}
            className="flex-1 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-dark transition-colors hover:bg-surface sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
