import { sql } from './db'
import type { Product } from '@/types'

// ST-015 / TK-030 (A15. Wishlist — wire to backend). Persists per customer_id
// so it survives across devices, unlike the in-memory-only cart.

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

// ON CONFLICT DO NOTHING: the heart toggle is idempotent — re-adding an
// already-wishlisted product (e.g. a stale client re-sending a click) is a
// no-op, not an error.
export async function addToWishlist(customerId: string, productId: string): Promise<void> {
  await sql`
    INSERT INTO wishlist_items (customer_id, product_id)
    VALUES (${customerId}, ${productId})
    ON CONFLICT (customer_id, product_id) DO NOTHING
  `
}

export async function removeFromWishlist(customerId: string, productId: string): Promise<void> {
  await sql`
    DELETE FROM wishlist_items
    WHERE customer_id = ${customerId} AND product_id = ${productId}
  `
}

export async function getWishlist(customerId: string): Promise<Product[]> {
  const rows = await sql`
    SELECT products.* FROM products
    JOIN wishlist_items ON wishlist_items.product_id = products.id
    WHERE wishlist_items.customer_id = ${customerId}
    ORDER BY wishlist_items.created_at DESC
  `
  return rows.map(mapProduct)
}

export async function getWishlistedProductIds(customerId: string): Promise<string[]> {
  const rows = await sql`
    SELECT product_id FROM wishlist_items WHERE customer_id = ${customerId}
  `
  return rows.map((row) => row.product_id as string)
}
