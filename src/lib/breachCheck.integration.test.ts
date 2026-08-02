import { describe, it, expect } from 'vitest'
import { checkBreached } from './breachCheck'

// Hits the real HIBP API once, to prove the k-anonymity request/response
// handling actually works end to end — the mocked unit tests in
// validation.test.ts only prove validateRegistration reacts correctly to
// whatever checkBreached returns, not that checkBreached itself is correct.
//
// Opt-in only (skipped by default, same reasoning as the DATABASE_URL-gated
// audit_logs suite): a real third-party network call has no place in the
// default `npm test` run or blocking CI on HIBP being briefly unreachable.
// Run explicitly with: RUN_HIBP_INTEGRATION_TEST=1 npx vitest run src/lib/breachCheck.integration.test.ts
const RUN = process.env.RUN_HIBP_INTEGRATION_TEST

describe.skipIf(!RUN)('checkBreached (live HIBP)', () => {
  it('returns true for a password known to be in the breach corpus', async () => {
    expect(await checkBreached('password')).toBe(true)
  })

  it('returns false for a freshly-generated random password', async () => {
    const random = `Vn-${crypto.randomUUID()}`
    expect(await checkBreached(random)).toBe(false)
  })
})
