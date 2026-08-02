import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))

const NOW = new Date('2026-08-02T12:00:00Z')

function couponRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'coupon-1', code: 'SAVE10', type: 'percent', value: '10.00',
    valid_from: new Date('2026-01-01T00:00:00Z'),
    valid_to: new Date('2026-12-31T23:59:59Z'),
    max_uses: 100, current_uses: 0,
    created_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getCouponByCode', () => {
  it('returns null when no coupon matches the code', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getCouponByCode } = await import('./coupons')
    expect(await getCouponByCode('NOPE')).toBeNull()
  })

  it('maps a found row to a Coupon', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([couponRow()])

    const { getCouponByCode } = await import('./coupons')
    const coupon = await getCouponByCode('SAVE10')

    expect(coupon).toMatchObject({ id: 'coupon-1', code: 'SAVE10', type: 'percent', value: 10 })
  })
})

describe('validateCoupon', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns not_found for a nonexistent code', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { validateCoupon } = await import('./coupons')
    const result = await validateCoupon('NOPE', 100)

    expect(result).toEqual({ valid: false, reason: 'not_found' })
  })

  it('returns not_yet_valid before valid_from', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([
      couponRow({ valid_from: new Date('2027-01-01T00:00:00Z') }),
    ])

    const { validateCoupon } = await import('./coupons')
    const result = await validateCoupon('SAVE10', 100)

    expect(result).toEqual({ valid: false, reason: 'not_yet_valid' })
  })

  it('returns expired after valid_to', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([
      couponRow({ valid_to: new Date('2025-01-01T00:00:00Z') }),
    ])

    const { validateCoupon } = await import('./coupons')
    const result = await validateCoupon('SAVE10', 100)

    expect(result).toEqual({ valid: false, reason: 'expired' })
  })

  it('returns usage_limit_reached when current_uses has hit max_uses', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([
      couponRow({ max_uses: 5, current_uses: 5 }),
    ])

    const { validateCoupon } = await import('./coupons')
    const result = await validateCoupon('SAVE10', 100)

    expect(result).toEqual({ valid: false, reason: 'usage_limit_reached' })
  })

  it('computes a percent discount against the subtotal', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([couponRow({ type: 'percent', value: '20.00' })])

    const { validateCoupon } = await import('./coupons')
    const result = await validateCoupon('SAVE10', 200)

    if (!result.valid) throw new Error('expected the coupon to validate')
    expect(result.discount).toBeCloseTo(40) // 20% of 200
  })

  it('computes a fixed discount against the subtotal', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([couponRow({ type: 'fixed', value: '15.00' })])

    const { validateCoupon } = await import('./coupons')
    const result = await validateCoupon('SAVE10', 200)

    if (!result.valid) throw new Error('expected the coupon to validate')
    expect(result.discount).toBeCloseTo(15)
  })

  // A fixed discount larger than the subtotal must never produce a negative
  // total — cap it at the subtotal itself.
  it('caps a fixed discount at the subtotal rather than going negative', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([couponRow({ type: 'fixed', value: '500.00' })])

    const { validateCoupon } = await import('./coupons')
    const result = await validateCoupon('SAVE10', 50)

    if (!result.valid) throw new Error('expected the coupon to validate')
    expect(result.discount).toBe(50)
  })
})

describe('incrementCouponUsage', () => {
  it('returns true when the atomic update reserves a usage slot', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{ id: 'coupon-1' }])

    const { incrementCouponUsage } = await import('./coupons')
    expect(await incrementCouponUsage('coupon-1')).toBe(true)
  })

  it('returns false when the coupon is already at max_uses (no row updated)', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { incrementCouponUsage } = await import('./coupons')
    expect(await incrementCouponUsage('coupon-1')).toBe(false)
  })
})
