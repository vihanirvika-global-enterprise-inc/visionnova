import { describe, it, expect } from 'vitest'
import { currencyForRegion } from './currency'
import { regionForCountry } from './region'

describe('currencyForRegion', () => {
  it('charges the IN region in INR', () => {
    expect(currencyForRegion('IN')).toBe('INR')
  })

  it('charges the GLOBAL region in USD', () => {
    expect(currencyForRegion('GLOBAL')).toBe('USD')
  })
})

describe('currencyForRegion composed with regionForCountry', () => {
  it('follows the shipping country rather than the provider default', () => {
    expect(currencyForRegion(regionForCountry('IN'))).toBe('INR')
    expect(currencyForRegion(regionForCountry('US'))).toBe('USD')
    expect(currencyForRegion(regionForCountry('GB'))).toBe('USD')
  })
})
