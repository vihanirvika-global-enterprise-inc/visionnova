import { sql } from './db'
import type { ProductImage } from '@/types'

function mapProductImage(row: Record<string, unknown>): ProductImage {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    url: row.url as string,
    alt: (row.alt as string | null) ?? null,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as Date,
  }
}

export async function getProductImages(productId: string): Promise<ProductImage[]> {
  const rows = await sql`
    SELECT * FROM product_images WHERE product_id = ${productId} ORDER BY sort_order ASC
  `
  return rows.map(mapProductImage)
}
