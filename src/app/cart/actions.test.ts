import { describe, it, expect, vi } from 'vitest'
import * as Coupons from '@/lib/coupons'
import { applyCouponAction } from './actions'

vi.mock('@/lib/coupons', () => ({
  validateCoupon: vi.fn(),
}))

describe('applyCouponAction', () => {
  // This is a preview only — it must never touch usage counts. Only
  // checkoutAction (at actual order-creation time) increments current_uses.
  it('validates the coupon against the given subtotal without incrementing usage', async () => {
    vi.mocked(Coupons.validateCoupon).mockResolvedValue({
      valid: true,
      coupon: {
        id: 'coupon-1', code: 'SAVE10', type: 'percent', value: 10,
        validFrom: new Date(), validTo: new Date(),
        maxUses: 100, currentUses: 5, createdAt: new Date(),
      },
      discount: 20,
    })

    const result = await applyCouponAction('SAVE10', 200)

    expect(Coupons.validateCoupon).toHaveBeenCalledWith('SAVE10', 200)
    expect(result).toEqual({
      valid: true,
      coupon: expect.objectContaining({ code: 'SAVE10' }),
      discount: 20,
    })
  })

  it('passes through a rejection reason unchanged', async () => {
    vi.mocked(Coupons.validateCoupon).mockResolvedValue({
      valid: false,
      reason: 'expired',
    })

    const result = await applyCouponAction('OLDCODE', 200)

    expect(result).toEqual({ valid: false, reason: 'expired' })
  })
})
