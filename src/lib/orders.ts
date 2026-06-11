import { sql } from './db'
import type { Order, ShippingAddress } from '@/types'
import { getCustomerById } from './customers'
import { sendOrderShippedEmail } from './email'

interface CreateOrderInput {
  customerId: string
  totalAmount: number
  shippingAddress: ShippingAddress
}

function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    status: row.status as Order['status'],
    totalAmount: parseFloat(row.total_amount as string),
    shippingAddress: row.shipping_address as ShippingAddress,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const rows = await sql`
    INSERT INTO orders (customer_id, total_amount, shipping_address)
    VALUES (${input.customerId}, ${input.totalAmount}, ${JSON.stringify(input.shippingAddress)})
    RETURNING *
  `
  return mapOrder(rows[0])
}

export async function getOrdersByCustomer(customerId: string): Promise<Order[]> {
  const rows = await sql`
    SELECT * FROM orders WHERE customer_id = ${customerId} ORDER BY created_at DESC
  `
  return rows.map(mapOrder)
}

export async function getOrderById(id: string): Promise<Order | null> {
  const rows = await sql`SELECT * FROM orders WHERE id = ${id} LIMIT 1`
  return rows.length > 0 ? mapOrder(rows[0]) : null
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
  const rows = await sql`
    UPDATE orders SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  const order = mapOrder(rows[0])

  if (status === 'shipped') {
    const customer = await getCustomerById(order.customerId)
    if (customer) {
      await sendOrderShippedEmail({
        to: customer.email,
        firstName: customer.firstName,
        orderId: order.id,
      })
    }
  }

  return order
}
