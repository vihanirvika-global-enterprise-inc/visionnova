// Consent record for analytics cookies (DPDP).
//
// Stored in localStorage rather than a cookie. The record is not itself a
// tracking identifier — it holds a decision and the date it was made, nothing
// that identifies the visitor — and storing it is what lets the site honour
// "no" instead of asking again on every page.
//
// Twelve months, which is the common practice ceiling: consent that was given
// long enough ago stops being informed, so it lapses and is asked again.

export type ConsentDecision = 'accepted' | 'rejected'

export interface ConsentRecord {
  decision: ConsentDecision
  decidedAt: string
}

export const CONSENT_STORAGE_KEY = 'visionnova.cookie-consent'
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

const DECISIONS: readonly string[] = ['accepted', 'rejected']

function storage(): Storage | null {
  // The banner is a client component but still renders on the server, where
  // there is no localStorage. Safari with storage disabled throws on access
  // rather than returning null, so this is a try, not a typeof check.
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * @param now Injectable for expiry tests.
 * @returns The stored decision, or null when undecided, unreadable or lapsed.
 */
export function readConsent(now: number = Date.now()): ConsentRecord | null {
  const store = storage()
  if (!store) return null

  const raw = store.getItem(CONSENT_STORAGE_KEY)
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // localStorage is writable by anything running on this origin and
    // survives deploys, so a malformed record is expected rather than
    // exceptional. Undecided is the safe reading: it re-asks.
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  const { decision, decidedAt } = parsed as Partial<ConsentRecord>

  if (typeof decision !== 'string' || !DECISIONS.includes(decision)) return null
  if (typeof decidedAt !== 'string') return null

  const decidedAtMs = Date.parse(decidedAt)
  if (Number.isNaN(decidedAtMs)) return null
  if (now - decidedAtMs > CONSENT_MAX_AGE_MS) return null

  return { decision: decision as ConsentDecision, decidedAt }
}

export function writeConsent(decision: ConsentDecision, now: number = Date.now()): void {
  const store = storage()
  if (!store) return

  const record: ConsentRecord = { decision, decidedAt: new Date(now).toISOString() }
  try {
    store.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Quota or private-mode failure. The decision then lasts for the session
    // only and is asked again next visit, which is the conservative outcome.
  }
}

export function clearConsent(): void {
  const store = storage()
  if (!store) return

  try {
    store.removeItem(CONSENT_STORAGE_KEY)
  } catch {
    /* nothing useful to do */
  }
}
