import { MIN_PASSWORD_LENGTH } from './passwordPolicy'
import { createErrorCollector, type ValidationResult, type FieldErrors } from './validationResult'
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

// Re-exported so existing server callers (checkoutAction) and the existing
// test suite keep importing these from one place. The implementation lives in
// shippingAddress.ts because the checkout form runs it in the browser too,
// and this module reaches the database.
export { validateShippingAddress, type ShippingAddressInput } from './shippingAddress'
export type { FieldErrors, ValidationResult }
