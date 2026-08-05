import bcrypt from 'bcryptjs'
import { createCustomer, getCustomerByEmail } from './customers'
import type { Customer } from '@/types'

const SALT_ROUNDS = 10

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email already registered')
    this.name = 'DuplicateEmailError'
  }
}

function isEmailUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505' &&
    'constraint_name' in error &&
    (error as { constraint_name: unknown }).constraint_name === 'customers_email_key'
  )
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS)
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash)
}

interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  // ST-021 (EP-007): lets partner onboarding create the account with
  // role='partner_optometrist' directly, reusing the same hashing and
  // duplicate-email handling rather than a separate role-upgrade step.
  role?: Customer['role']
}

export async function registerUser(input: RegisterInput): Promise<Customer> {
  const passwordHash = await hashPassword(input.password)
  try {
    return await createCustomer({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
    })
  } catch (error) {
    // Backstop for the race condition validateRegistration's precheck can't
    // close on its own: two near-simultaneous registrations for the same
    // email can both pass the precheck before either has been inserted.
    if (isEmailUniqueViolation(error)) {
      throw new DuplicateEmailError()
    }
    throw error
  }
}

export async function loginUser(email: string, password: string): Promise<Customer | null> {
  const customer = await getCustomerByEmail(email)
  if (!customer) return null
  const valid = await verifyPassword(password, customer.passwordHash)
  return valid ? customer : null
}
