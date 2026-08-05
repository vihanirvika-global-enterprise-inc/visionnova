import { describe, it, expect, beforeEach } from 'vitest'
import {
  readConsent,
  writeConsent,
  clearConsent,
  CONSENT_STORAGE_KEY,
  CONSENT_MAX_AGE_MS,
} from './cookieConsent'

beforeEach(() => {
  window.localStorage.clear()
})

describe('readConsent', () => {
  it('returns null when nothing has been decided', () => {
    expect(readConsent()).toBeNull()
  })

  it.each(['accepted', 'rejected'] as const)('returns a stored %s decision', (decision) => {
    writeConsent(decision)

    expect(readConsent()?.decision).toBe(decision)
  })

  // A rejection is a decision. Re-asking on the next page load is the dark
  // pattern where "no" is treated as "not yet".
  it('treats a rejection as decided, not as absent', () => {
    writeConsent('rejected')

    expect(readConsent()).not.toBeNull()
  })

  it('returns null once the record is older than the max age', () => {
    const now = Date.now()
    writeConsent('accepted', now - CONSENT_MAX_AGE_MS - 1)

    expect(readConsent(now)).toBeNull()
  })

  it('still returns a record that is just inside the max age', () => {
    const now = Date.now()
    writeConsent('accepted', now - CONSENT_MAX_AGE_MS + 1000)

    expect(readConsent(now)?.decision).toBe('accepted')
  })

  it('expires after twelve months', () => {
    expect(CONSENT_MAX_AGE_MS).toBe(365 * 24 * 60 * 60 * 1000)
  })

  // Storage is attacker-writable and survives deploys, so a malformed or
  // truncated record must read as "no decision" rather than throwing on
  // every page load.
  it.each([
    ['not json at all', 'garbage'],
    ['json of the wrong shape', '{"foo":"bar"}'],
    ['an unrecognised decision', '{"decision":"maybe","decidedAt":"2026-01-01T00:00:00.000Z"}'],
    ['a missing timestamp', '{"decision":"accepted"}'],
  ])('returns null for %s', (_label, stored) => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, stored)

    expect(readConsent()).toBeNull()
  })
})

describe('writeConsent', () => {
  it('records when the decision was made so it can expire', () => {
    const now = Date.parse('2026-03-01T12:00:00.000Z')
    writeConsent('accepted', now)

    expect(readConsent(now)?.decidedAt).toBe(new Date(now).toISOString())
  })

  it('replaces an earlier decision rather than appending', () => {
    writeConsent('accepted')
    writeConsent('rejected')

    expect(readConsent()?.decision).toBe('rejected')
  })
})

describe('clearConsent', () => {
  it('removes the record so the banner is asked again', () => {
    writeConsent('accepted')
    clearConsent()

    expect(readConsent()).toBeNull()
  })
})

describe('server-side rendering', () => {
  // The module is imported by a client component that also renders on the
  // server, where localStorage does not exist. Throwing there would take the
  // whole page down.
  it('reads as undecided when there is no window', () => {
    const original = globalThis.window
    // @ts-expect-error — deliberately simulating the server
    delete globalThis.window

    try {
      expect(readConsent()).toBeNull()
      expect(() => writeConsent('accepted')).not.toThrow()
    } finally {
      globalThis.window = original
    }
  })
})
