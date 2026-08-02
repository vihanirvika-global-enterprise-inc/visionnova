import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit } from './rateLimit'
import { captureRateLimitOutage } from './sentry'

vi.mock('./sentry', () => ({
  captureRateLimitOutage: vi.fn(),
}))

const ORIGINAL_ENV = { ...process.env }

function pipelineResponse(count: number, ttlMs: number) {
  return {
    ok: true,
    status: 200,
    json: async () => [{ result: count }, { result: count === 1 ? 1 : 0 }, { result: ttlMs }],
  }
}

beforeEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://fake-upstash.example.com'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  vi.mocked(captureRateLimitOutage).mockReset()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllGlobals()
})

describe('checkRateLimit — boundary', () => {
  it('allows requests 1 through 5 in the window', async () => {
    for (let count = 1; count <= 5; count++) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pipelineResponse(count, 60_000)))
      const result = await checkRateLimit('1.2.3.4', 'register')
      expect(result.allowed).toBe(true)
    }
  })

  it('rejects the 6th request in the window with a positive retryAfterSeconds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pipelineResponse(6, 42_000)))
    const result = await checkRateLimit('1.2.3.4', 'register')
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBe(42)
  })

  // Simulates real window expiry: Redis's key expired, so the next INCR
  // creates a fresh counter starting at 1 again — same as the very first
  // request, proving the block isn't permanent.
  it('allows a request again once the window has reset (count back to 1)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pipelineResponse(1, 60_000)))
    const result = await checkRateLimit('1.2.3.4', 'register')
    expect(result.allowed).toBe(true)
  })
})

describe('checkRateLimit — key isolation (IP + endpoint)', () => {
  it('uses a different key for a different IP on the same endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pipelineResponse(1, 60_000))
    vi.stubGlobal('fetch', fetchMock)

    await checkRateLimit('1.1.1.1', 'register')
    await checkRateLimit('2.2.2.2', 'register')

    const [firstCall, secondCall] = fetchMock.mock.calls
    const firstBody = JSON.parse(firstCall[1].body)
    const secondBody = JSON.parse(secondCall[1].body)
    const firstKey = firstBody[0][1]
    const secondKey = secondBody[0][1]

    expect(firstKey).not.toBe(secondKey)
    expect(firstKey).toContain('1.1.1.1')
    expect(secondKey).toContain('2.2.2.2')
  })

  it('uses a different key for a different endpoint with the same IP', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pipelineResponse(1, 60_000))
    vi.stubGlobal('fetch', fetchMock)

    await checkRateLimit('1.1.1.1', 'register')
    await checkRateLimit('1.1.1.1', 'login')

    const [firstCall, secondCall] = fetchMock.mock.calls
    const firstKey = JSON.parse(firstCall[1].body)[0][1]
    const secondKey = JSON.parse(secondCall[1].body)[0][1]

    expect(firstKey).not.toBe(secondKey)
    expect(firstKey).toContain('register')
    expect(secondKey).toContain('login')
  })

  it('uses the same key for repeated requests from the same IP and endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pipelineResponse(1, 60_000))
    vi.stubGlobal('fetch', fetchMock)

    await checkRateLimit('1.1.1.1', 'register')
    await checkRateLimit('1.1.1.1', 'register')

    const [firstCall, secondCall] = fetchMock.mock.calls
    const firstKey = JSON.parse(firstCall[1].body)[0][1]
    const secondKey = JSON.parse(secondCall[1].body)[0][1]

    expect(firstKey).toBe(secondKey)
  })
})

describe('checkRateLimit — fail-open scoping', () => {
  it('fails open and logs a distinct outage when the fetch call itself throws (transport failure)', async () => {
    const transportError = new Error('fetch failed: ECONNREFUSED')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(transportError))

    const result = await checkRateLimit('1.2.3.4', 'register')

    expect(result.allowed).toBe(true)
    expect(captureRateLimitOutage).toHaveBeenCalledWith(
      transportError,
      expect.objectContaining({ reason: 'transport' })
    )
  })

  it('fails open and logs a distinct outage when Upstash responds with a 5xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'unavailable' }) })
    )

    const result = await checkRateLimit('1.2.3.4', 'register')

    expect(result.allowed).toBe(true)
    expect(captureRateLimitOutage).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ reason: 'upstash-5xx' })
    )
  })

  // The line this whole design hinges on: a 4xx means OUR request was wrong
  // (bad token, malformed command) — not that Upstash is unreachable. This
  // must be a real, visible error, not a silent security downgrade.
  it('does NOT fail open on a 4xx — throws instead, and does not log an outage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'invalid token' }) })
    )

    await expect(checkRateLimit('1.2.3.4', 'register')).rejects.toThrow()
    expect(captureRateLimitOutage).not.toHaveBeenCalled()
  })
})
