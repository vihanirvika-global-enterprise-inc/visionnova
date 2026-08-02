import { sql } from './db'
import type { Coupon } from '@/types'

function mapCoupon(row: Record<string, unknown>): Coupon {
  return {
    id: row.id as string,
    code: row.code as string,
    type: row.type as Coupon['type'],
    value: parseFloat(row.value as string),
    validFrom: row.valid_from as Date,
    validTo: row.valid_to as Date,
    maxUses: row.max_uses as number,
    currentUses: row.current_uses as number,
    createdAt: row.created_at as Date,
  }
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const rows = await sql`SELECT * FROM coupons WHERE code = ${code} LIMIT 1`
  return rows.length > 0 ? mapCoupon(rows[0]) : null
}

export type CouponRejectionReason =
  | 'not_found'
  | 'not_yet_valid'
  | 'expired'
  | 'usage_limit_reached'

export type CouponValidationResult =
  | { valid: true; coupon: Coupon; discount: number }
  | { valid: false; reason: CouponRejectionReason }

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const coupon = await getCouponByCode(code)
  if (!coupon) return { valid: false, reason: 'not_found' }

  const now = new Date()
  if (now < coupon.validFrom) return { valid: false, reason: 'not_yet_valid' }
  if (now > coupon.validTo) return { valid: false, reason: 'expired' }
  if (coupon.currentUses >= coupon.maxUses) {
    return { valid: false, reason: 'usage_limit_reached' }
  }

  const rawDiscount =
    coupon.type === 'percent' ? subtotal * (coupon.value / 100) : coupon.value

  // A fixed discount larger than the subtotal must never produce a negative
  // total.
  const discount = Math.min(rawDiscount, subtotal)

  return { valid: true, coupon, discount }
}

// Atomic: the WHERE clause re-checks current_uses < max_uses as part of the
// same UPDATE, so Postgres's row lock serializes concurrent attempts against
// the same coupon — a second concurrent call against an already-maxed coupon
// returns no rows, rather than racing a separate check-then-increment.
export async function incrementCouponUsage(couponId: string): Promise<boolean> {
  const rows = await sql`
    UPDATE coupons SET current_uses = current_uses + 1
    WHERE id = ${couponId} AND current_uses < max_uses
    RETURNING id
  `
  return rows.length > 0
}
