import { isValidCountryCode } from './countries'
import { checkBreached } from './breachCheck'
import { captureAuthWarning } from './sentry'
import { getCustomerByEmail } from './customers'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 10

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

export async function validateRegistration(input: RegistrationInput): Promise<ValidationResult> {
  const errors: string[] = []

  if (!EMAIL_REGEX.test(input.email)) {
    errors.push('Invalid email address')
  } else {
    // Same generic message regardless of the existing account's role
    // (customer/optometrist/admin) — no reason to ever reveal that.
    const existing = await getCustomerByEmail(input.email)
    if (existing) {
      errors.push('Email already registered')
    }
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }

  if (!input.firstName.trim()) {
    errors.push('First name is required')
  }

  if (!input.lastName.trim()) {
    errors.push('Last name is required')
  }

  // Skip the breach check entirely on an already-too-short password: no
  // point spending a network round trip on input that's already rejected.
  if (input.password.length >= MIN_PASSWORD_LENGTH) {
    try {
      const breached = await checkBreached(input.password)
      if (breached) {
        errors.push('This password has appeared in a data breach — please choose another')
      }
    } catch (error) {
      // Fail open: a third-party breach-list API being briefly unreachable
      // must not be able to take down registration entirely.
      captureAuthWarning(error as Error, { check: 'breach-list' })
    }
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
