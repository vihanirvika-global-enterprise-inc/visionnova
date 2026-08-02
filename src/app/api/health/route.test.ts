import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('@/lib/db', () => ({ sql: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/health', () => {
  it('returns 200 with status ok when the DB check succeeds', async () => {
    const { sql } = await import('@/lib/db')
    mockSql(sql).mockResolvedValueOnce([{ '?column?': 1 }])

    const { GET } = await import('./route')
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('returns 503 with status unhealthy when the DB check fails, without leaking internal details', async () => {
    const { sql } = await import('@/lib/db')
    mockSql(sql).mockRejectedValueOnce(
      new Error('password authentication failed for user "postgres" at postgresql://user:hunter2@db-host:5432/prod')
    )

    const { GET } = await import('./route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ status: 'unhealthy' })
    // The raw error (which could contain a connection string, credentials, or
    // a stack trace) must never reach the response body — this endpoint is
    // intentionally unauthenticated, so anything leaked here is public.
    expect(JSON.stringify(body)).not.toMatch(/hunter2|postgresql:\/\/|at Object|node_modules/)
  })

  it('returns 503 rather than hanging when the DB check exceeds its timeout', async () => {
    vi.useFakeTimers()
    const { sql } = await import('@/lib/db')
    mockSql(sql).mockReturnValueOnce(new Promise(() => {})) // never resolves

    const { GET } = await import('./route')
    const responsePromise = GET()

    await vi.advanceTimersByTimeAsync(5000)
    const response = await responsePromise

    expect(response.status).toBe(503)
  })
})
