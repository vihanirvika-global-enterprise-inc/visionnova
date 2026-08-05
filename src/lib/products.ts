import { sql } from './db'
import type { Product } from '@/types'

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    price: parseFloat(row.price as string),
    category: row.category as Product['category'],
    sku: row.sku as string,
    stockQuantity: row.stock_quantity as number,
    imageUrl: row.image_url as string | null,
    requiresPrescription: row.requires_prescription as boolean,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export async function getProducts(): Promise<Product[]> {
  const rows = await sql`SELECT * FROM products ORDER BY created_at DESC`
  return rows.map(mapProduct)
}

export async function getProductById(id: string): Promise<Product | null> {
  const rows = await sql`SELECT * FROM products WHERE id = ${id} LIMIT 1`
  return rows.length > 0 ? mapProduct(rows[0]) : null
}

export async function getProductsByCategory(category: Product['category']): Promise<Product[]> {
  const rows = await sql`SELECT * FROM products WHERE category = ${category} ORDER BY created_at DESC`
  return rows.map(mapProduct)
}

export async function getInStockProducts(): Promise<Product[]> {
  const rows = await sql`SELECT * FROM products WHERE stock_quantity > 0 ORDER BY created_at DESC`
  return rows.map(mapProduct)
}

export type ProductSort = 'price_asc' | 'price_desc' | 'newest'

export interface CatalogQueryOptions {
  q?: string
  sort?: ProductSort
  page?: number
  pageSize?: number
}

export interface CatalogQueryResult {
  products: Product[]
  totalCount: number
}

const DEFAULT_PAGE_SIZE = 12

// Six flat queries rather than composing WHERE/ORDER BY from dynamic
// fragments: ORDER BY's column and direction can't be a bind parameter (only
// values can), and the two axes here (search on/off, sort) form a small,
// fixed matrix. This keeps every branch a single, directly-parameterized
// query — the same shape as every other function in this file.
export async function getCatalogProducts(
  options: CatalogQueryOptions = {}
): Promise<CatalogQueryResult> {
  const { q, sort = 'newest', page = 1, pageSize = DEFAULT_PAGE_SIZE } = options
  const safePage = Math.max(1, page)
  const safePageSize = Math.max(1, pageSize)
  const offset = (safePage - 1) * safePageSize
  const pattern = q ? `%${q}%` : null

  let rows: Record<string, unknown>[]
  let countRows: Record<string, unknown>[]

  if (pattern) {
    if (sort === 'price_asc') {
      rows = await sql`
        SELECT * FROM products
        WHERE stock_quantity > 0 AND (name ILIKE ${pattern} OR description ILIKE ${pattern})
        ORDER BY price ASC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    } else if (sort === 'price_desc') {
      rows = await sql`
        SELECT * FROM products
        WHERE stock_quantity > 0 AND (name ILIKE ${pattern} OR description ILIKE ${pattern})
        ORDER BY price DESC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    } else {
      rows = await sql`
        SELECT * FROM products
        WHERE stock_quantity > 0 AND (name ILIKE ${pattern} OR description ILIKE ${pattern})
        ORDER BY created_at DESC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    }
    countRows = await sql`
      SELECT COUNT(*)::int AS count FROM products
      WHERE stock_quantity > 0 AND (name ILIKE ${pattern} OR description ILIKE ${pattern})
    `
  } else {
    if (sort === 'price_asc') {
      rows = await sql`
        SELECT * FROM products
        WHERE stock_quantity > 0
        ORDER BY price ASC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    } else if (sort === 'price_desc') {
      rows = await sql`
        SELECT * FROM products
        WHERE stock_quantity > 0
        ORDER BY price DESC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    } else {
      rows = await sql`
        SELECT * FROM products
        WHERE stock_quantity > 0
        ORDER BY created_at DESC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    }
    countRows = await sql`
      SELECT COUNT(*)::int AS count FROM products
      WHERE stock_quantity > 0
    `
  }

  return {
    products: rows.map(mapProduct),
    totalCount: (countRows[0]?.count as number) ?? 0,
  }
}

// ST-003 / ST-004 (Sunglasses & Contact Lenses Catalogs). Same flat-query
// shape as getCatalogProducts and for the same reason — ORDER BY's column
// can't be a bind parameter — with category as a fixed, always-present filter
// rather than a third on/off axis, so it stays six branches, not twelve.
export async function getCatalogProductsByCategory(
  category: Product['category'],
  options: CatalogQueryOptions = {}
): Promise<CatalogQueryResult> {
  const { q, sort = 'newest', page = 1, pageSize = DEFAULT_PAGE_SIZE } = options
  const safePage = Math.max(1, page)
  const safePageSize = Math.max(1, pageSize)
  const offset = (safePage - 1) * safePageSize
  const pattern = q ? `%${q}%` : null

  let rows: Record<string, unknown>[]
  let countRows: Record<string, unknown>[]

  if (pattern) {
    if (sort === 'price_asc') {
      rows = await sql`
        SELECT * FROM products
        WHERE category = ${category} AND stock_quantity > 0
          AND (name ILIKE ${pattern} OR description ILIKE ${pattern})
        ORDER BY price ASC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    } else if (sort === 'price_desc') {
      rows = await sql`
        SELECT * FROM products
        WHERE category = ${category} AND stock_quantity > 0
          AND (name ILIKE ${pattern} OR description ILIKE ${pattern})
        ORDER BY price DESC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    } else {
      rows = await sql`
        SELECT * FROM products
        WHERE category = ${category} AND stock_quantity > 0
          AND (name ILIKE ${pattern} OR description ILIKE ${pattern})
        ORDER BY created_at DESC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    }
    countRows = await sql`
      SELECT COUNT(*)::int AS count FROM products
      WHERE category = ${category} AND stock_quantity > 0
        AND (name ILIKE ${pattern} OR description ILIKE ${pattern})
    `
  } else {
    if (sort === 'price_asc') {
      rows = await sql`
        SELECT * FROM products
        WHERE category = ${category} AND stock_quantity > 0
        ORDER BY price ASC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    } else if (sort === 'price_desc') {
      rows = await sql`
        SELECT * FROM products
        WHERE category = ${category} AND stock_quantity > 0
        ORDER BY price DESC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    } else {
      rows = await sql`
        SELECT * FROM products
        WHERE category = ${category} AND stock_quantity > 0
        ORDER BY created_at DESC
        LIMIT ${safePageSize} OFFSET ${offset}
      `
    }
    countRows = await sql`
      SELECT COUNT(*)::int AS count FROM products
      WHERE category = ${category} AND stock_quantity > 0
    `
  }

  return {
    products: rows.map(mapProduct),
    totalCount: (countRows[0]?.count as number) ?? 0,
  }
}
