import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

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
    mockSql(sql).mockResolvedValueOnce(mockRows)

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
    mockSql(sql).mockResolvedValueOnce([{
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
    mockSql(sql).mockResolvedValueOnce([])

    const { getProductById } = await import('./products')
    const result = await getProductById('nonexistent')

    expect(result).toBeNull()
  })
})

describe('getProductsByCategory', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns only products matching the given category', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{
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
    mockSql(sql).mockResolvedValueOnce([{
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

describe('getCatalogProducts', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  function row(overrides: Record<string, unknown> = {}) {
    return {
      id: 'prod-001', name: 'Classic Frame', description: 'A frame',
      price: '89.99', category: 'frames' as const, sku: 'CF-001',
      stock_quantity: 5, image_url: null, requires_prescription: false,
      created_at: new Date(), updated_at: new Date(),
      ...overrides,
    }
  }

  // Every call issues exactly one SELECT and one COUNT — verified against a
  // real local Postgres instance (search/sort/pagination all produced
  // correct results) before writing these unit tests, since a mocked `sql`
  // can't itself prove the composed SQL is valid.
  function mockRowsThenCount(spy: ReturnType<typeof mockSql>, rows: unknown[], count: number) {
    spy.mockResolvedValueOnce(rows)
    spy.mockResolvedValueOnce([{ count }])
  }

  it('returns unfiltered in-stock products and the real total count when no query is given', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    mockRowsThenCount(spy, [row()], 1)

    const { getCatalogProducts } = await import('./products')
    const result = await getCatalogProducts({})

    expect(sql).toHaveBeenCalledTimes(2)
    expect(result.products).toHaveLength(1)
    expect(result.products[0].name).toBe('Classic Frame')
    expect(result.totalCount).toBe(1)
  })

  it('passes the search term as a parameterized ILIKE pattern, not string-concatenated', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    mockRowsThenCount(spy, [], 0)

    const { getCatalogProducts } = await import('./products')
    await getCatalogProducts({ q: 'aviator' })

    const selectParams = spy.mock.calls[0].slice(1)
    const countParams = spy.mock.calls[1].slice(1)
    expect(selectParams).toContain('%aviator%')
    expect(countParams).toContain('%aviator%')
  })

  it('does not filter by search when q is empty', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    mockRowsThenCount(spy, [row()], 1)

    const { getCatalogProducts } = await import('./products')
    const result = await getCatalogProducts({ q: '' })

    expect(result.products).toHaveLength(1)
    const selectParams = spy.mock.calls[0].slice(1)
    expect(selectParams).not.toContain('%%')
  })

  it.each([
    ['price_asc', 'ORDER BY price ASC'],
    ['price_desc', 'ORDER BY price DESC'],
    ['newest', 'ORDER BY created_at DESC'],
  ] as const)('sorts by %s', async (sort, expectedOrderBy) => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    mockRowsThenCount(spy, [], 0)

    const { getCatalogProducts } = await import('./products')
    await getCatalogProducts({ sort })

    const selectStrings = (spy.mock.calls[0][0] as string[]).join('')
    expect(selectStrings).toContain(expectedOrderBy)
  })

  it('defaults to newest sort when no sort is given', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    mockRowsThenCount(spy, [], 0)

    const { getCatalogProducts } = await import('./products')
    await getCatalogProducts({})

    const selectStrings = (spy.mock.calls[0][0] as string[]).join('')
    expect(selectStrings).toContain('ORDER BY created_at DESC')
  })

  it('applies LIMIT/OFFSET matching the requested page and page size', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    mockRowsThenCount(spy, [], 0)

    const { getCatalogProducts } = await import('./products')
    await getCatalogProducts({ page: 3, pageSize: 12 })

    const selectParams = spy.mock.calls[0].slice(1)
    expect(selectParams).toContain(12) // LIMIT
    expect(selectParams).toContain(24) // OFFSET = (3 - 1) * 12
  })

  it('defaults to page 1 when no page is given', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    mockRowsThenCount(spy, [], 0)

    const { getCatalogProducts } = await import('./products')
    await getCatalogProducts({ pageSize: 12 })

    const selectParams = spy.mock.calls[0].slice(1)
    expect(selectParams).toContain(0) // OFFSET = (1 - 1) * 12
  })

  // A page past the last one is a normal, expected navigation — real
  // Postgres returns zero rows for an out-of-range OFFSET, not an error.
  it('returns an empty product list, not an error, when the page is beyond available results', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    mockRowsThenCount(spy, [], 3)

    const { getCatalogProducts } = await import('./products')
    const result = await getCatalogProducts({ page: 999 })

    expect(result.products).toEqual([])
    expect(result.totalCount).toBe(3)
  })

  it('combines search, sort, and pagination correctly in a single query', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    mockRowsThenCount(spy, [row({ name: 'Aviator Classic' })], 1)

    const { getCatalogProducts } = await import('./products')
    const result = await getCatalogProducts({
      q: 'aviator', sort: 'price_desc', page: 2, pageSize: 5,
    })

    expect(result.products).toHaveLength(1)
    expect(result.totalCount).toBe(1)

    const selectStrings = (spy.mock.calls[0][0] as string[]).join('')
    const selectParams = spy.mock.calls[0].slice(1)
    expect(selectStrings).toContain('ORDER BY price DESC')
    expect(selectParams).toContain('%aviator%')
    expect(selectParams).toContain(5) // LIMIT
    expect(selectParams).toContain(5) // OFFSET = (2 - 1) * 5
  })
})
