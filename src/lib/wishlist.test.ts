import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('addToWishlist', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts a wishlist row for the customer and product', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { addToWishlist } = await import('./wishlist')
    await addToWishlist('customer-1', 'product-1')

    expect(sql).toHaveBeenCalledOnce()
  })
})

describe('removeFromWishlist', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('deletes the wishlist row for the customer and product', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { removeFromWishlist } = await import('./wishlist')
    await removeFromWishlist('customer-1', 'product-1')

    expect(sql).toHaveBeenCalledOnce()
  })
})

describe('getWishlist', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns the products a customer has wishlisted', async () => {
    const { sql } = await import('./db')
    const mockRows = [
      {
        id: 'abc-123',
        name: 'Classic Frame',
        description: null,
        price: '89.99',
        category: 'frames',
        sku: 'CF-001',
        stock_quantity: 10,
        image_url: null,
        requires_prescription: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]
    mockSql(sql).mockResolvedValueOnce(mockRows)

    const { getWishlist } = await import('./wishlist')
    const result = await getWishlist('customer-1')

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Classic Frame')
    expect(result[0].price).toBe(89.99)
  })
})

describe('getWishlistedProductIds', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns just the product ids a customer has wishlisted', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{ product_id: 'product-1' }, { product_id: 'product-2' }])

    const { getWishlistedProductIds } = await import('./wishlist')
    const result = await getWishlistedProductIds('customer-1')

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toEqual(['product-1', 'product-2'])
  })
})
