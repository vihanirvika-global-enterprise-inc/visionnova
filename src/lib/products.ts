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
