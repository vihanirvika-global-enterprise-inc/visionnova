import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('getProductImages', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns images for a product ordered by sort_order', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([
      {
        id: 'img-1', product_id: 'prod-1', url: 'https://cdn/1.jpg',
        alt: 'Front view', sort_order: 0, created_at: new Date(),
      },
      {
        id: 'img-2', product_id: 'prod-1', url: 'https://cdn/2.jpg',
        alt: 'Side view', sort_order: 1, created_at: new Date(),
      },
    ])

    const { getProductImages } = await import('./productImages')
    const result = await getProductImages('prod-1')

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 'img-1', url: 'https://cdn/1.jpg', alt: 'Front view', sortOrder: 0 })
    expect(result[1]).toMatchObject({ id: 'img-2', url: 'https://cdn/2.jpg', alt: 'Side view', sortOrder: 1 })

    const params = mockSql(sql).mock.calls[0].slice(1)
    expect(params).toContain('prod-1')
  })

  it('maps a null alt column to null, not a fallback string', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([
      { id: 'img-1', product_id: 'prod-1', url: 'https://cdn/1.jpg', alt: null, sort_order: 0, created_at: new Date() },
    ])

    const { getProductImages } = await import('./productImages')
    const result = await getProductImages('prod-1')

    expect(result[0].alt).toBeNull()
  })

  it('returns an empty array for a product with no image rows', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getProductImages } = await import('./productImages')
    const result = await getProductImages('prod-no-images')

    expect(result).toEqual([])
  })
})
