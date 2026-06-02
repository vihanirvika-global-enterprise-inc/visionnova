import bcrypt from 'bcryptjs'
import { createCustomer } from './customers'
import type { Customer } from '@/types'

const SALT_ROUNDS = 10

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
}

export async function registerUser(input: RegisterInput): Promise<Customer> {
  const passwordHash = await hashPassword(input.password)
  return createCustomer({
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
  })
}
