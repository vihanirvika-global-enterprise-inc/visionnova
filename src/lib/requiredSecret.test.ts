import { describe, it, expect, afterEach, vi } from 'vitest'
import { requiredSecret, DEV_SECRET_FALLBACK } from './requiredSecret'

const VAR = 'TEST_ONLY_SECRET'

afterEach(() => {
  vi.unstubAllEnvs()
  delete process.env[VAR]
})

describe('requiredSecret', () => {
  // The whole point of the module: production must never sign or encrypt
  // with a constant that is published in this repository.
  it('throws in production when the variable is unset', () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env[VAR]

    expect(() => requiredSecret(VAR)).toThrow()
  })

  // Ops reads this out of a crash log at 3am; an anonymous "secret missing"
  // would not say which of the three to go and set.
  it('names the missing variable so it is diagnosable from logs', () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env[VAR]

    expect(() => requiredSecret(VAR)).toThrow(new RegExp(VAR))
  })

  it('returns the real value in production when the variable is set', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv(VAR, 'a-real-production-secret')

    expect(requiredSecret(VAR)).toBe('a-real-production-secret')
  })

  // Local development must keep working with no setup, matching how
  // rateLimit.ts treats missing Upstash credentials outside production.
  it('falls back outside production so local development is unaffected', () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env[VAR]

    expect(requiredSecret(VAR)).toBe(DEV_SECRET_FALLBACK)
  })

  it('still prefers a real value outside production when one is set', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv(VAR, 'a-local-secret')

    expect(requiredSecret(VAR)).toBe('a-local-secret')
  })

  // Distinctive on purpose: if this string ever surfaces in a log, a token
  // or a ciphertext dump, it should be immediately obvious what happened.
  it('uses a recognisable fallback constant', () => {
    expect(DEV_SECRET_FALLBACK).toBe('dev-secret-change-in-production')
  })

  // An empty string is unset for these purposes — an env var exported as ""
  // would otherwise sign sessions with a zero-length key.
  it('treats an empty value as unset', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv(VAR, '')

    expect(() => requiredSecret(VAR)).toThrow(new RegExp(VAR))
  })
})
