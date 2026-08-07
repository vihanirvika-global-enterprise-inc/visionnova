import { sql } from './db'
import type { Customer, CustomerRole } from '@/types'

interface CreateCustomerInput {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone?: string
  // Defaults to the DB's own 'customer' default when omitted — existing
  // callers (customer registration) are unaffected.
  role?: CustomerRole
}

// Email addresses are case-insensitive in practice, but the column is plain
// TEXT — so every value has to be normalised here, before it reaches a query.
// Doing it at this boundary covers registration, the duplicate-email precheck,
// login, and partner onboarding from one place.
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    phone: row.phone as string | null,
    role: (row.role as CustomerRole) ?? 'customer',
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const rows = await sql`
    INSERT INTO customers (email, password_hash, first_name, last_name, phone, role)
    VALUES (
      ${normaliseEmail(input.email)}, ${input.passwordHash}, ${input.firstName}, ${input.lastName},
      ${input.phone ?? null}, ${input.role ?? 'customer'}
    )
    RETURNING *
  `
  return mapCustomer(rows[0])
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const rows = await sql`SELECT * FROM customers WHERE email = ${normaliseEmail(email)} LIMIT 1`
  return rows.length > 0 ? mapCustomer(rows[0]) : null
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const rows = await sql`SELECT * FROM customers WHERE id = ${id} LIMIT 1`
  return rows.length > 0 ? mapCustomer(rows[0]) : null
}
