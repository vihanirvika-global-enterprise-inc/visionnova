import { isValidCountryCode } from './countries'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface RegistrationInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateRegistration(input: RegistrationInput): ValidationResult {
  const errors: string[] = []

  if (!EMAIL_REGEX.test(input.email)) {
    errors.push('Invalid email address')
  }

  if (input.password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }

  if (!input.firstName.trim()) {
    errors.push('First name is required')
  }

  if (!input.lastName.trim()) {
    errors.push('Last name is required')
  }

  return { valid: errors.length === 0, errors }
}

interface LoginInput {
  email: string
  password: string
}

export function validateLogin(input: LoginInput): ValidationResult {
  const errors: string[] = []

  if (!EMAIL_REGEX.test(input.email)) {
    errors.push('Invalid email address')
  }

  if (!input.password) {
    errors.push('Password is required')
  }

  return { valid: errors.length === 0, errors }
}

interface ShippingAddressInput {
  line1: string
  city: string
  state: string
  postalCode: string
  country: string
}

export function validateShippingAddress(input: ShippingAddressInput): ValidationResult {
  const errors: string[] = []

  if (!input.line1.trim()) errors.push('Street address is required')
  if (!input.city.trim()) errors.push('City is required')
  if (!input.postalCode.trim()) errors.push('Postal code is required')
  if (!isValidCountryCode(input.country)) errors.push('A valid country is required')

  return { valid: errors.length === 0, errors }
}
