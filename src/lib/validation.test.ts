import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateRegistration, validateLogin, validateShippingAddress } from './validation'
import { checkBreached } from './breachCheck'
import { captureAuthWarning } from './sentry'
import { getCustomerByEmail } from './customers'

vi.mock('./breachCheck', () => ({
  checkBreached: vi.fn(),
}))

vi.mock('./sentry', () => ({
  captureAuthWarning: vi.fn(),
}))

vi.mock('./customers', () => ({
  getCustomerByEmail: vi.fn(),
}))

// 10 chars, not found in the mocked breach list unless a test says otherwise.
const VALID_PASSWORD = 'secret12345'

const EXISTING_CUSTOMER = {
  id: 'cust-1', email: 'jane@example.com', passwordHash: 'hash',
  firstName: 'Jane', lastName: 'Doe', phone: null, role: 'customer' as const,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('validateRegistration', () => {
  beforeEach(() => {
    vi.mocked(checkBreached).mockReset().mockResolvedValue(false)
    vi.mocked(captureAuthWarning).mockReset()
    vi.mocked(getCustomerByEmail).mockReset().mockResolvedValue(null)
  })

  it('returns no errors for valid input', async () => {
    const result = await validateRegistration({
      email: 'jane@example.com', password: VALID_PASSWORD,
      firstName: 'Jane', lastName: 'Doe',
    })
    expect(result.errors).toHaveLength(0)
    expect(result.valid).toBe(true)
  })

  it('returns an error for an invalid email', async () => {
    const result = await validateRegistration({
      email: 'not-an-email', password: VALID_PASSWORD,
      firstName: 'Jane', lastName: 'Doe',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Invalid email address')
  })

  // Boundary: 9 chars must fail, 10 chars must pass — off-by-one is the
  // classic bug on a minimum-length check.
  it('returns an error when password is 9 characters (below the minimum)', async () => {
    const result = await validateRegistration({
      email: 'jane@example.com', password: '123456789',
      firstName: 'Jane', lastName: 'Doe',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 10 characters')
  })

  it('accepts a password that is exactly 10 characters', async () => {
    const result = await validateRegistration({
      email: 'jane@example.com', password: '1234567890',
      firstName: 'Jane', lastName: 'Doe',
    })
    expect(result.errors).not.toContain('Password must be at least 10 characters')
  })

  it('returns an error for an empty password', async () => {
    const result = await validateRegistration({
      email: 'jane@example.com', password: '',
      firstName: 'Jane', lastName: 'Doe',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 10 characters')
  })

  it('returns an error when first name is empty', async () => {
    const result = await validateRegistration({
      email: 'jane@example.com', password: VALID_PASSWORD,
      firstName: '', lastName: 'Doe',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('First name is required')
  })

  it('returns an error when last name is empty', async () => {
    const result = await validateRegistration({
      email: 'jane@example.com', password: VALID_PASSWORD,
      firstName: 'Jane', lastName: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Last name is required')
  })

  it('returns an error when the password is found in the breach list', async () => {
    vi.mocked(checkBreached).mockResolvedValue(true)

    const result = await validateRegistration({
      email: 'jane@example.com', password: VALID_PASSWORD,
      firstName: 'Jane', lastName: 'Doe',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      'This password has appeared in a data breach — please choose another'
    )
  })

  it('is valid when the password is not found in the breach list', async () => {
    vi.mocked(checkBreached).mockResolvedValue(false)

    const result = await validateRegistration({
      email: 'jane@example.com', password: VALID_PASSWORD,
      firstName: 'Jane', lastName: 'Doe',
    })

    expect(result.valid).toBe(true)
  })

  // Fail open: a third-party breach-list API being briefly unreachable must
  // not be able to take down registration entirely.
  it('fails open (valid) and logs a warning when the breach check throws', async () => {
    const breachCheckError = new Error('HIBP request timed out')
    vi.mocked(checkBreached).mockRejectedValue(breachCheckError)

    const result = await validateRegistration({
      email: 'jane@example.com', password: VALID_PASSWORD,
      firstName: 'Jane', lastName: 'Doe',
    })

    expect(result.valid).toBe(true)
    expect(captureAuthWarning).toHaveBeenCalledWith(
      breachCheckError,
      expect.objectContaining({ check: 'breach-list' })
    )
  })

  it('returns a friendly error when the email is already registered', async () => {
    vi.mocked(getCustomerByEmail).mockResolvedValue(EXISTING_CUSTOMER)

    const result = await validateRegistration({
      email: 'jane@example.com', password: VALID_PASSWORD,
      firstName: 'Jane', lastName: 'Doe',
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Email already registered')
  })

  // Message must not vary by the existing account's role (customer vs.
  // optometrist vs. admin) — there is no reason to ever tell an
  // unauthenticated caller what kind of account an email belongs to.
  it('uses the same generic message regardless of the existing account role', async () => {
    vi.mocked(getCustomerByEmail).mockResolvedValue({ ...EXISTING_CUSTOMER, role: 'admin' })

    const result = await validateRegistration({
      email: 'jane@example.com', password: VALID_PASSWORD,
      firstName: 'Jane', lastName: 'Doe',
    })

    expect(result.errors).toContain('Email already registered')
    expect(result.errors.join(' ')).not.toMatch(/admin|optometrist|customer|ops/i)
  })

  it('is valid when the email is not already registered', async () => {
    vi.mocked(getCustomerByEmail).mockResolvedValue(null)

    const result = await validateRegistration({
      email: 'new@example.com', password: VALID_PASSWORD,
      firstName: 'Jane', lastName: 'Doe',
    })

    expect(result.valid).toBe(true)
  })

  it('does not query for an existing account when the email is already malformed', async () => {
    await validateRegistration({
      email: 'not-an-email', password: VALID_PASSWORD,
      firstName: 'Jane', lastName: 'Doe',
    })

    expect(getCustomerByEmail).not.toHaveBeenCalled()
  })
})

describe('validateLogin', () => {
  it('returns no errors for valid input', () => {
    const result = validateLogin({ email: 'jane@example.com', password: 'secret123' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns an error for an invalid email', () => {
    const result = validateLogin({ email: 'not-an-email', password: 'secret123' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Invalid email address')
  })

  it('returns an error when password is empty', () => {
    const result = validateLogin({ email: 'jane@example.com', password: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password is required')
  })
})

describe('validateShippingAddress', () => {
  const validAddress = {
    line1: '123 Main St', city: 'Austin',
    state: 'TX', postalCode: '78701', country: 'US',
  }

  it('returns no errors for a valid address', () => {
    expect(validateShippingAddress(validAddress).valid).toBe(true)
  })

  it('returns an error when street address is empty', () => {
    const result = validateShippingAddress({ ...validAddress, line1: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Street address is required')
  })

  it('returns an error when city is empty', () => {
    const result = validateShippingAddress({ ...validAddress, city: '' })
    expect(result.errors).toContain('City is required')
  })

  it('returns an error when postal code is empty', () => {
    const result = validateShippingAddress({ ...validAddress, postalCode: '' })
    expect(result.errors).toContain('Postal code is required')
  })

  it('returns an error when country is empty', () => {
    const result = validateShippingAddress({ ...validAddress, country: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('A valid country is required')
  })

  // Region — and therefore payment provider — is derived from this field, so a
  // free-text country name must not reach the order.
  it('returns an error when country is not an ISO-3166 code', () => {
    for (const country of ['India', 'india', 'Bharat', 'XX']) {
      const result = validateShippingAddress({ ...validAddress, country })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('A valid country is required')
    }
  })

  it('accepts IN', () => {
    expect(validateShippingAddress({ ...validAddress, country: 'IN' }).valid).toBe(true)
  })
})
