'use client'

import Script from 'next/script'
import { useCookieConsent } from '@/components/consent/CookieConsentProvider'

// Previously these two <Script> tags sat directly in the root layout, gated
// only on NEXT_PUBLIC_GA4_ID being set — so GA4 loaded for every visitor.
// They move into a client component because consent is only knowable on the
// client: a server-rendered <Script> is already in the markup by the time
// anything could check.
export function GoogleAnalytics() {
  const { analyticsAllowed } = useCookieConsent()

  const measurementId = process.env.NEXT_PUBLIC_GA4_ID
  if (!measurementId || !analyticsAllowed) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer=window.dataLayer||[];
            function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());
            gtag('config','${measurementId}');
          `,
        }}
      />
    </>
  )
}
