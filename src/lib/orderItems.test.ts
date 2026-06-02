import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('addOrderItem', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts an order item and returns it', async () => {
    const { sql } = await import('./db')
    vi.mocked(sql).mockResolvedValueOnce([{
      id: 'item-001',
      order_id: 'order-001',
      product_id: 'prod-001',
      prescription_id: null,
      quantity: 2,
      unit_price: '89.99',
    }])

    const { addOrderItem } = await import('./orderItems')
    const result = await addOrderItem({
      orderId: 'order-001',
      productId: 'prod-001',
      quantity: 2,
      unitPrice: 89.99,
    })

    expect(sql).toHaveBeenCalledOnce()
    expect(result.id).toBe('item-001')
    expect(result.quantity).toBe(2)
    expect(result.unitPrice).toBe(89.99)
    expect(result.prescriptionId).toBeNull()
  })
})
