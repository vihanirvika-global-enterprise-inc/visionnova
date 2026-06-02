import { sql } from './db'
import type { Customer } from '@/types'

interface CreateCustomerInput {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone?: string
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    phone: row.phone as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const rows = await sql`
    INSERT INTO customers (email, password_hash, first_name, last_name, phone)
    VALUES (${input.email}, ${input.passwordHash}, ${input.firstName}, ${input.lastName}, ${input.phone ?? null})
    RETURNING *
  `
  return mapCustomer(rows[0])
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const rows = await sql`SELECT * FROM customers WHERE email = ${email} LIMIT 1`
  return rows.length > 0 ? mapCustomer(rows[0]) : null
}
