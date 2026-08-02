import { describe, it, expect } from 'vitest'
import { checkRateLimit } from './rateLimit'

// Hits a real Upstash Redis REST endpoint once, to prove the pipeline
// request/response handling actually works end to end — the mocked unit
// tests in rateLimit.test.ts only prove checkRateLimit reacts correctly to
// whatever Upstash returns, not that the real INCR/PEXPIRE/PTTL pipeline is
// well-formed.
//
// Opt-in only, same reasoning as the DATABASE_URL-gated audit_logs suite and
// the HIBP integration test: requires real UPSTASH_REDIS_REST_URL/TOKEN,
// which this environment does not have configured, so this suite has not
// been run against a live Upstash instance as part of this work — it's
// built to the same contract as the other integration tests in this repo,
// verified by inspection, but not behaviorally confirmed here the way HIBP
// and Postgres were. Whoever configures real Upstash credentials should run
// this once before relying on it.
//
// Run explicitly with: RUN_UPSTASH_INTEGRATION_TEST=1 npx vitest run src/lib/rateLimit.integration.test.ts
const RUN = process.env.RUN_UPSTASH_INTEGRATION_TEST

describe.skipIf(!RUN)('checkRateLimit (live Upstash)', () => {
  it('allows the first 5 requests and rejects the 6th, for a unique test key', async () => {
    const uniqueIp = `test-${crypto.randomUUID()}`

    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(uniqueIp, 'integration-test')
      expect(result.allowed).toBe(true)
    }

    const sixth = await checkRateLimit(uniqueIp, 'integration-test')
    expect(sixth.allowed).toBe(false)
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0)
  })
})
