import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('generateOtpCode', () => {
  it('generates a 6-digit numeric code', async () => {
    const { generateOtpCode } = await import('./loginOtp')
    const code = generateOtpCode()

    expect(code).toMatch(/^\d{6}$/)
  })

  it('generates different codes across calls', async () => {
    const { generateOtpCode } = await import('./loginOtp')
    const codes = new Set(Array.from({ length: 20 }, () => generateOtpCode()))

    // Not a strict uniqueness guarantee (6 digits can collide), but 20 draws
    // from a 900,000-value space colliding would indicate a broken generator.
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('createLoginOtp', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts a hashed code with a 5-minute expiry and returns the raw code', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    // INSERT ... RETURNING id: the row id is what lets a failed dispatch
    // clean up the code nobody received.
    spy.mockResolvedValueOnce([{ id: 'otp-1' }])

    const { createLoginOtp } = await import('./loginOtp')
    const before = Date.now()
    const { code } = await createLoginOtp('cust-1')
    const after = Date.now()

    expect(code).toMatch(/^\d{6}$/)
    expect(sql).toHaveBeenCalledOnce()

    const params = spy.mock.calls[0].slice(1)
    // The raw code must never be one of the bound params — only its hash.
    expect(params).not.toContain(code)

    const expiresAt = params.find((p): p is Date => p instanceof Date)
    expect(expiresAt).toBeDefined()
    const deltaMs = expiresAt!.getTime() - before
    expect(deltaMs).toBeGreaterThanOrEqual(5 * 60_000 - 1000)
    expect(deltaMs).toBeLessThanOrEqual(after - before + 5 * 60_000 + 1000)
  })
})

describe('verifyLoginOtp', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns true and consumes the OTP when the code matches an unexpired, unconsumed row', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    spy.mockResolvedValueOnce([{ id: 'otp-1' }]) // SELECT finds it
    spy.mockResolvedValueOnce([]) // UPDATE consumes it

    const { verifyLoginOtp } = await import('./loginOtp')
    const result = await verifyLoginOtp('cust-1', '123456')

    expect(result).toBe(true)
    expect(sql).toHaveBeenCalledTimes(2)
  })

  it('returns false when no matching unconsumed, unexpired row exists', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    spy.mockResolvedValueOnce([]) // SELECT finds nothing

    const { verifyLoginOtp } = await import('./loginOtp')
    const result = await verifyLoginOtp('cust-1', '000000')

    expect(result).toBe(false)
    expect(sql).toHaveBeenCalledTimes(1) // never reaches the consuming UPDATE
  })
})

describe('deleteLoginOtp', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('deletes only the row it is given', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    spy.mockResolvedValueOnce([])

    const { deleteLoginOtp } = await import('./loginOtp')
    await deleteLoginOtp('otp-1')

    expect(sql).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0].slice(1)).toEqual(['otp-1'])
  })
})
