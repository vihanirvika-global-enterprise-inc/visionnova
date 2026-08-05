import { captureRateLimitOutage } from './sentry'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 5
const REQUEST_TIMEOUT_MS = 500

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

// IP+endpoint, not IP alone: hammering /register shouldn't also lock a
// legitimate user out of /login from the same shared IP (NAT, corporate
// network, mobile carrier).
function buildKey(ip: string, endpoint: string): string {
  return `ratelimit:${endpoint}:${ip}`
}

// Once per process: this is hit on every rate-limited request in local dev,
// and a warning per keystroke-triggered action would bury real output.
let warnedRateLimitDisabled = false
function warnRateLimitDisabledOnce(): void {
  if (warnedRateLimitDisabled) return
  warnedRateLimitDisabled = true
  console.warn(
    '[rateLimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set — ' +
      'rate limiting is DISABLED. This is allowed outside production only.',
  )
}

// Raw REST calls, not the @upstash/redis SDK: the SDK's UpstashError
// discards the original HTTP status code on any non-ok response, which makes
// it impossible to tell "Upstash is down" (5xx) apart from "our request was
// wrong" (4xx) — exactly the distinction fail-open scoping depends on.
export async function checkRateLimit(ip: string, endpoint: string): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    // Production must never serve traffic with rate limiting silently absent:
    // a deploy missing these should fail loudly, not accept unlimited attempts.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set')
    }
    // Outside production the control is simply unconfigured — not an outage,
    // so it is not reported to Sentry. Throwing here instead made every
    // rate-limited endpoint unusable without an Upstash account.
    warnRateLimitDisabledOnce()
    return { allowed: true }
  }

  const key = buildKey(ip, endpoint)

  let response: Response
  try {
    response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // NX on PEXPIRE: the window's expiry is set only on the request that
      // creates the key (count === 1), atomically, so concurrent requests
      // can't each reset the window and make it never expire.
      body: JSON.stringify([
        ['INCR', key],
        ['PEXPIRE', key, WINDOW_MS, 'NX'],
        ['PTTL', key],
      ]),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    // Transport-level failure (network error, DNS, timeout/abort): Upstash
    // is genuinely unreachable. Fail open, but loudly — see
    // captureRateLimitOutage.
    captureRateLimitOutage(error as Error, { key, reason: 'transport' })
    return { allowed: true }
  }

  if (response.status >= 500) {
    // Upstash's own side failing is the same "unreachable" story as a
    // transport error, not a bug in our request.
    captureRateLimitOutage(new Error(`Upstash responded with ${response.status}`), {
      key,
      reason: 'upstash-5xx',
    })
    return { allowed: true }
  }

  if (!response.ok) {
    // 4xx means OUR request was wrong (bad token, malformed command) — a
    // real bug, not "Upstash is unreachable". Must surface as a real error,
    // not silently disable rate limiting.
    throw new Error(`Upstash rate-limit request failed with status ${response.status}`)
  }

  const results = (await response.json()) as [
    { result: number },
    { result: number },
    { result: number },
  ]
  const count = results[0].result
  const ttlMs = results[2].result

  if (count > MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)) }
  }

  return { allowed: true }
}
