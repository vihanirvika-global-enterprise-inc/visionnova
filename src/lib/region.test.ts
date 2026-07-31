import { describe, it, expect } from 'vitest'
import { regionForCountry } from './region'

describe('regionForCountry', () => {
  it('maps India to the IN region', () => {
    expect(regionForCountry('IN')).toBe('IN')
  })

  it('maps every other country to GLOBAL', () => {
    expect(regionForCountry('US')).toBe('GLOBAL')
    expect(regionForCountry('GB')).toBe('GLOBAL')
    expect(regionForCountry('AE')).toBe('GLOBAL')
  })

  // Defensive: this decides which gateway takes the customer's money, so a
  // casing slip must not silently route an Indian customer to the global provider.
  it('normalises case before mapping', () => {
    expect(regionForCountry('in')).toBe('IN')
    expect(regionForCountry('In')).toBe('IN')
  })

  it('falls back to GLOBAL for unknown or empty input', () => {
    expect(regionForCountry('XX')).toBe('GLOBAL')
    expect(regionForCountry('')).toBe('GLOBAL')
  })
})
