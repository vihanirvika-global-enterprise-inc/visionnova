import { describe, it, expect } from 'vitest'
import { validateRegistration, validateLogin, validateShippingAddress } from './validation'

describe('validateRegistration', () => {
  it('returns no errors for valid input', () => {
    const result = validateRegistration({
      email: 'jane@example.com', password: 'secret123',
      firstName: 'Jane', lastName: 'Doe',
    })
    expect(result.errors).toHaveLength(0)
    expect(result.valid).toBe(true)
  })

  it('returns an error for an invalid email', () => {
    const result = validateRegistration({
      email: 'not-an-email', password: 'secret123',
      firstName: 'Jane', lastName: 'Doe',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Invalid email address')
  })

  it('returns an error when password is shorter than 8 characters', () => {
    const result = validateRegistration({
      email: 'jane@example.com', password: 'short',
      firstName: 'Jane', lastName: 'Doe',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 8 characters')
  })

  it('returns an error when first name is empty', () => {
    const result = validateRegistration({
      email: 'jane@example.com', password: 'secret123',
      firstName: '', lastName: 'Doe',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('First name is required')
  })

  it('returns an error when last name is empty', () => {
    const result = validateRegistration({
      email: 'jane@example.com', password: 'secret123',
      firstName: 'Jane', lastName: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Last name is required')
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
