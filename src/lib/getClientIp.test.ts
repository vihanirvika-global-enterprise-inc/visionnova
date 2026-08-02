import { describe, it, expect, vi, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import { getClientIp } from './getClientIp'

afterEach(() => {
  vi.restoreAllMocks()
})

function mockForwardedFor(value: string | null) {
  vi.spyOn(NextHeaders, 'headers').mockReturnValue({
    get: (name: string) => (name === 'x-forwarded-for' ? value : null),
  } as any)
}

describe('getClientIp', () => {
  it('returns the client IP from x-forwarded-for', () => {
    mockForwardedFor('203.0.113.5')
    expect(getClientIp()).toBe('203.0.113.5')
  })

  // x-forwarded-for is a comma-separated chain when the request passes
  // through multiple proxies — the first entry is the original client, the
  // rest were added by intermediate proxies.
  it('takes the first IP when x-forwarded-for has a proxy chain', () => {
    mockForwardedFor('203.0.113.5, 70.41.3.18, 150.172.238.178')
    expect(getClientIp()).toBe('203.0.113.5')
  })

  it('falls back to "unknown" when x-forwarded-for is absent', () => {
    mockForwardedFor(null)
    expect(getClientIp()).toBe('unknown')
  })
})
