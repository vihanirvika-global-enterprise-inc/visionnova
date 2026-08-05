'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  readConsent,
  writeConsent,
  clearConsent,
  type ConsentDecision,
} from '@/lib/cookieConsent'

interface CookieConsentValue {
  /** null until the stored decision has been read on the client. */
  decision: ConsentDecision | null
  /** False during SSR and the first client render, so nothing flashes. */
  hydrated: boolean
  /** True only for an explicit, unexpired acceptance. */
  analyticsAllowed: boolean
  accept: () => void
  reject: () => void
  /** Drops the record so the banner asks again — used by the privacy page. */
  revoke: () => void
}

const CookieConsentContext = createContext<CookieConsentValue | null>(null)

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [decision, setDecision] = useState<ConsentDecision | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Deliberately not read during render. localStorage does not exist on the
  // server, so a render-time read would make the server and client markup
  // disagree — the banner would render on the server and vanish on hydrate,
  // which is the flash this avoids.
  useEffect(() => {
    setDecision(readConsent()?.decision ?? null)
    setHydrated(true)
  }, [])

  const decide = useCallback((next: ConsentDecision) => {
    writeConsent(next)
    setDecision(next)
  }, [])

  const accept = useCallback(() => decide('accepted'), [decide])
  const reject = useCallback(() => decide('rejected'), [decide])

  const revoke = useCallback(() => {
    clearConsent()
    setDecision(null)
  }, [])

  return (
    <CookieConsentContext.Provider
      value={{
        decision,
        hydrated,
        analyticsAllowed: decision === 'accepted',
        accept,
        reject,
        revoke,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  )
}

// Any tracker added later reads consent through this rather than reaching for
// localStorage itself — that is what stops the next integration reintroducing
// the gap this closes.
export function useCookieConsent(): CookieConsentValue {
  const context = useContext(CookieConsentContext)
  if (!context) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider')
  }
  return context
}
