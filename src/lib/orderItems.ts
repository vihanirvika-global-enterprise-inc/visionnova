import { sql } from './db'
import type { OrderItem } from '@/types'

interface AddOrderItemInput {
  orderId: string
  productId: string
  quantity: number
  unitPrice: number
  prescriptionId?: string
}

function mapOrderItem(row: Record<string, unknown>): OrderItem {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    productId: row.product_id as string,
    prescriptionId: row.prescription_id as string | null,
    quantity: row.quantity as number,
    unitPrice: parseFloat(row.unit_price as string),
  }
}

export async function addOrderItem(input: AddOrderItemInput): Promise<OrderItem> {
  const rows = await sql`
    INSERT INTO order_items (order_id, product_id, prescription_id, quantity, unit_price)
    VALUES (${input.orderId}, ${input.productId}, ${input.prescriptionId ?? null}, ${input.quantity}, ${input.unitPrice})
    RETURNING *
  `
  return mapOrderItem(rows[0])
}
