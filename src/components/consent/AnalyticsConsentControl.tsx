'use client'

import { useCookieConsent } from './CookieConsentProvider'

// DPDP requires withdrawing consent to be as easy as giving it. Without a
// control here, the only way to change the answer given to the banner would be
// clearing site data in browser settings — which is not "as easy", and would
// make the banner's Accept a one-way door.
export function AnalyticsConsentControl() {
  const { decision, hydrated, accept, reject } = useCookieConsent()

  if (!hydrated) {
    return <p className="text-sm text-muted">Loading your analytics preference…</p>
  }

  const label =
    decision === 'accepted'
      ? 'Analytics cookies: allowed'
      : decision === 'rejected'
        ? 'Analytics cookies: not allowed'
        : 'Analytics cookies: no choice recorded yet'

  return (
    <div>
      <p className="mb-3 text-sm text-dark" data-testid="analytics-consent-status">
        {label}
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={reject} className="btn-secondary text-sm">
          Don&apos;t allow analytics
        </button>
        <button type="button" onClick={accept} className="btn-secondary text-sm">
          Allow analytics
        </button>
      </div>
    </div>
  )
}
