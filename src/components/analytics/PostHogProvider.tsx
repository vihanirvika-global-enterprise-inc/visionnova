'use client'

import { useEffect, useRef } from 'react'
import posthog from 'posthog-js'
import { useCookieConsent } from '@/components/consent/CookieConsentProvider'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { analyticsAllowed } = useCookieConsent()
  const initialised = useRef(false)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return

    // No consent, or consent withdrawn: init is never called, so posthog-js
    // loads no remote script and captures nothing. Gating capture after init
    // would still have contacted PostHog and still have set its cookies.
    if (!analyticsAllowed) {
      if (initialised.current) {
        // Withdrawn mid-session. reset() drops the distinct id and any
        // identified session; opt_out_capturing() stops anything further.
        posthog.reset()
        posthog.opt_out_capturing()
        initialised.current = false
      }
      return
    }

    if (initialised.current) return

    posthog.init(key, {
      api_host: 'https://app.posthog.com',
      autocapture: true,
      capture_pageview: true,
    })
    initialised.current = true
  }, [analyticsAllowed])

  return <>{children}</>
}
