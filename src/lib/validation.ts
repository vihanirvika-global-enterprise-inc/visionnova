import { isValidCountryCode } from './countries'
import { MIN_PASSWORD_LENGTH } from './passwordPolicy'
import { checkBreached } from './breachCheck'
import { captureAuthWarning } from './sentry'
import { getCustomerByEmail } from './customers'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Re-exported so existing server-side importers keep working. Client
// components must import it from './passwordPolicy' directly — this module
// reaches the database, so pulling it into a browser bundle breaks the build.
export { MIN_PASSWORD_LENGTH }

interface RegistrationInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

export type FieldErrors = Record<string, string[]>

interface ValidationResult {
  valid: boolean
  errors: string[]
  // Same messages as `errors`, keyed by the field they belong to, so a form
  // can mark the right input invalid and move focus to it. `errors` is kept
  // for callers that only need a flat list.
  fieldErrors: FieldErrors
}

// Collects messages per field and derives the flat list from them, so the two
// views can never disagree about what went wrong.
function createErrorCollector() {
  const fieldErrors: FieldErrors = {}

  return {
    add(field: string, message: string) {
      ;(fieldErrors[field] ??= []).push(message)
    },
    result(): ValidationResult {
      const errors = Object.values(fieldErrors).flat()
      return { valid: errors.length === 0, errors, fieldErrors }
    },
  }
}

export async function validateRegistration(input: RegistrationInput): Promise<ValidationResult> {
  const collector = createErrorCollector()

  if (!EMAIL_REGEX.test(input.email)) {
    collector.add('email', 'Invalid email address')
  } else {
    // Same generic message regardless of the existing account's role
    // (customer/optometrist/admin) — no reason to ever reveal that.
    const existing = await getCustomerByEmail(input.email)
    if (existing) {
      collector.add('email', 'Email already registered')
    }
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    collector.add('password', `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }

  if (!input.firstName.trim()) {
    collector.add('firstName', 'First name is required')
  }

  if (!input.lastName.trim()) {
    collector.add('lastName', 'Last name is required')
  }

  // Skip the breach check entirely on an already-too-short password: no
  // point spending a network round trip on input that's already rejected.
  if (input.password.length >= MIN_PASSWORD_LENGTH) {
    try {
      const breached = await checkBreached(input.password)
      if (breached) {
        collector.add('password', 'This password has appeared in a data breach — please choose another')
      }
    } catch (error) {
      // Fail open: a third-party breach-list API being briefly unreachable
      // must not be able to take down registration entirely.
      captureAuthWarning(error as Error, { check: 'breach-list' })
    }
  }

  return collector.result()
}

interface LoginInput {
  email: string
  password: string
}

export function validateLogin(input: LoginInput): ValidationResult {
  const collector = createErrorCollector()

  if (!EMAIL_REGEX.test(input.email)) {
    collector.add('email', 'Invalid email address')
  }

  if (!input.password) {
    collector.add('password', 'Password is required')
  }

  return collector.result()
}

interface ShippingAddressInput {
  line1: string
  city: string
  state: string
  postalCode: string
  country: string
}

export function validateShippingAddress(input: ShippingAddressInput): ValidationResult {
  const collector = createErrorCollector()

  if (!input.line1.trim()) collector.add('line1', 'Street address is required')
  if (!input.city.trim()) collector.add('city', 'City is required')
  if (!input.postalCode.trim()) collector.add('postalCode', 'Postal code is required')
  if (!isValidCountryCode(input.country)) collector.add('country', 'A valid country is required')

  return collector.result()
}
