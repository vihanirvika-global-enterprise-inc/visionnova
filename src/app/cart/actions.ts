'use server'

import { validateCoupon } from '@/lib/coupons'
import type { CouponValidationResult } from '@/lib/coupons'

// Preview only, for the cart page — never increments usage. The only place
// that consumes a coupon use is checkoutAction, at actual order-creation
// time, since a coupon applied to a cart that's abandoned shouldn't consume
// a use.
export async function applyCouponAction(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  return validateCoupon(code, subtotal)
}
