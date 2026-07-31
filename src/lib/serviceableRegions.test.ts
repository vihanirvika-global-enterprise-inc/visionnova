import { describe, it, expect } from 'vitest'
import { isServiceableRegion, UNSERVICEABLE_REGION_MESSAGE } from './serviceableRegions'
import { regionForCountry } from './region'

describe('isServiceableRegion', () => {
  it('serves the IN region', () => {
    expect(isServiceableRegion('IN')).toBe(true)
  })

  // Prices are stored as plain INR numbers with no FX layer, so charging a
  // GLOBAL customer would bill the rupee figure in dollars.
  it('does not serve GLOBAL until multi-currency pricing exists', () => {
    expect(isServiceableRegion('GLOBAL')).toBe(false)
  })
})

describe('isServiceableRegion composed with regionForCountry', () => {
  it('accepts Indian addresses', () => {
    expect(isServiceableRegion(regionForCountry('IN'))).toBe(true)
    expect(isServiceableRegion(regionForCountry('in'))).toBe(true)
  })

  it('rejects every other shipping country', () => {
    for (const country of ['US', 'GB', 'AE', 'SG', 'AU']) {
      expect(isServiceableRegion(regionForCountry(country))).toBe(false)
    }
  })
})

describe('UNSERVICEABLE_REGION_MESSAGE', () => {
  it('tells the customer plainly that we do not ship there yet', () => {
    expect(UNSERVICEABLE_REGION_MESSAGE).toMatch(/india/i)
    expect(UNSERVICEABLE_REGION_MESSAGE).toMatch(/yet|only/i)
  })
})
