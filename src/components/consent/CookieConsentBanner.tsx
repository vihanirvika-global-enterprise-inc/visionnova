'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCookieConsent } from './CookieConsentProvider'

const RESERVED_HEIGHT_PROPERTY = '--cookie-banner-height'

export function CookieConsentBanner() {
  const { decision, hydrated, accept, reject } = useCookieConsent()
  const bannerRef = useRef<HTMLDivElement | null>(null)

  // position:fixed takes the banner out of flow, so it reserves no space and
  // sits on top of whatever is at the bottom of the viewport — checkout form
  // fields, the homepage price tiers. Publishing the measured height lets the
  // page pad itself by exactly that much. Measured rather than hard-coded
  // because the copy wraps to a different number of lines by breakpoint.
  useEffect(() => {
    const banner = bannerRef.current
    const root = document.documentElement
    if (!banner) {
      root.style.removeProperty(RESERVED_HEIGHT_PROPERTY)
      return
    }

    function publishHeight() {
      root.style.setProperty(RESERVED_HEIGHT_PROPERTY, `${banner!.offsetHeight}px`)
    }

    publishHeight()

    // jsdom has no ResizeObserver; the initial measurement is what the tests
    // assert, and a browser gets the live updates.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publishHeight)
    observer?.observe(banner)

    return () => {
      observer?.disconnect()
      root.style.removeProperty(RESERVED_HEIGHT_PROPERTY)
    }
  })

  // Nothing until the stored decision is known. Rendering optimistically and
  // correcting after hydration is the flash this exists to avoid, and it would
  // show the banner to people who already answered.
  if (!hydrated || decision !== null) return null

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-heading"
      // bottom-16 clears MobileBottomNav, which is fixed to bottom-0 at z-40
      // and h-16: at bottom-0/z-50 this banner covered the whole mobile
      // navigation until the visitor answered. The nav is md:hidden, so the
      // offset is dropped from md up.
      className="fixed inset-x-0 bottom-16 z-50 border-t border-slate-200 bg-white p-4 shadow-lg sm:p-6 md:bottom-0"
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
