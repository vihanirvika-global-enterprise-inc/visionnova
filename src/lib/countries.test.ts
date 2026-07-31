import { describe, it, expect } from 'vitest'
import { COUNTRIES, isValidCountryCode } from './countries'

describe('COUNTRIES', () => {
  it('lists India first — the MVP home market', () => {
    expect(COUNTRIES[0]).toEqual({ code: 'IN', name: 'India' })
  })

  it('uses uppercase ISO-3166-1 alpha-2 codes throughout', () => {
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('has no duplicate codes', () => {
    const codes = COUNTRIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('isValidCountryCode', () => {
  it('accepts a listed code', () => {
    expect(isValidCountryCode('IN')).toBe(true)
    expect(isValidCountryCode('US')).toBe(true)
  })

  // The free-text field this replaces accepted all of these, which is what made
  // routing on country unsafe.
  it('rejects country names and mixed case', () => {
    expect(isValidCountryCode('India')).toBe(false)
    expect(isValidCountryCode('india')).toBe(false)
    expect(isValidCountryCode('in')).toBe(false)
    expect(isValidCountryCode('Bharat')).toBe(false)
  })

  it('rejects unlisted codes and empty input', () => {
    expect(isValidCountryCode('XX')).toBe(false)
    expect(isValidCountryCode('')).toBe(false)
  })
})
