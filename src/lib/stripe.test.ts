import { describe, it, expect, afterEach } from 'vitest'
import { vi } from 'vitest'

// loadStripe is a browser-only API — mock it so tests run in the Node.js environment.
// The stripe Node SDK (used by getServerStripe) is NOT mocked here: the Stripe
// constructor makes no HTTP calls, so the real class runs safely in tests.
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}))

import { getServerStripe, getClientStripe, _resetStripeInstance } from './stripe'

const originalKey = process.env.STRIPE_SECRET_KEY

afterEach(() => {
  // Restore env var — use delete if it was originally absent so the key is truly
  // undefined (process.env.X = undefined would set it to the string "undefined")
  if (originalKey === undefined) {
    delete process.env.STRIPE_SECRET_KEY
  } else {
    process.env.STRIPE_SECRET_KEY = originalKey
  }
  _resetStripeInstance()
})

// ── getServerStripe ───────────────────────────────────────────────────────────

describe('getServerStripe', () => {
  it('throws if STRIPE_SECRET_KEY is undefined', () => {
    delete process.env.STRIPE_SECRET_KEY
    expect(() => getServerStripe()).toThrow('STRIPE_SECRET_KEY is not set')
  })

  it('throws if STRIPE_SECRET_KEY is empty string', () => {
    process.env.STRIPE_SECRET_KEY = ''
    expect(() => getServerStripe()).toThrow('STRIPE_SECRET_KEY is not set')
  })

  it('returns a Stripe instance when key is set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_123'
    const instance = getServerStripe()
    expect(instance).toBeTruthy()
  })

  it('returns the same instance on repeated calls (singleton)', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_123'
    const first = getServerStripe()
    const second = getServerStripe()
    expect(first).toBe(second)
  })

  it('_resetStripeInstance() creates a new instance after reset', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_123'
    const first = getServerStripe()
    _resetStripeInstance()
    const second = getServerStripe()
    expect(first).not.toBe(second)
  })
})

// ── getClientStripe ───────────────────────────────────────────────────────────

describe('getClientStripe', () => {
  it('returns a promise', () => {
    const result = getClientStripe()
    expect(result).toBeInstanceOf(Promise)
  })

  it('returns the same promise on repeated calls (singleton)', () => {
    const first = getClientStripe()
    const second = getClientStripe()
    expect(first).toBe(second)
  })
})
