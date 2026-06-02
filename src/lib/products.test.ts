import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('getProducts', () => {
  beforeEach(() => vi.resetModules())

  it('returns an array of products from the database', async () => {
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
    vi.mocked(sql).mockResolvedValueOnce(mockRows)

    const { getProducts } = await import('./products')
    const result = await getProducts()

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Classic Frame')
    expect(result[0].price).toBe(89.99)
  })
})

describe('getProductById', () => {
  beforeEach(() => vi.resetModules())

  it('returns a single product by id', async () => {
    const { sql } = await import('./db')
    vi.mocked(sql).mockResolvedValueOnce([{
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
    }])

    const { getProductById } = await import('./products')
    const result = await getProductById('abc-123')

    expect(result?.name).toBe('Classic Frame')
    expect(result?.price).toBe(89.99)
  })

  it('returns null when product is not found', async () => {
    const { sql } = await import('./db')
    vi.mocked(sql).mockResolvedValueOnce([])

    const { getProductById } = await import('./products')
    const result = await getProductById('nonexistent')

    expect(result).toBeNull()
  })
})

describe('getProductsByCategory', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns only products matching the given category', async () => {
    const { sql } = await import('./db')
    vi.mocked(sql).mockResolvedValueOnce([{
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
    }])

    const { getProductsByCategory } = await import('./products')
    const result = await getProductsByCategory('frames')

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
    expect(result[0].category).toBe('frames')
  })
})

describe('getInStockProducts', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns only products with stock quantity greater than zero', async () => {
    const { sql } = await import('./db')
    vi.mocked(sql).mockResolvedValueOnce([{
      id: 'prod-001', name: 'Classic Frame', description: null,
      price: '89.99', category: 'frames', sku: 'CF-001',
      stock_quantity: 5, image_url: null, requires_prescription: false,
      created_at: new Date(), updated_at: new Date(),
    }])

    const { getInStockProducts } = await import('./products')
    const result = await getInStockProducts()

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
    expect(result[0].stockQuantity).toBe(5)
  })
})
