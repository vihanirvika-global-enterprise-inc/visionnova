import { describe, it, expect } from 'vitest'
import { regionForCountry } from '@/lib/region'
import { selectProvider } from './select-provider'
import { stripeProvider } from './stripe-provider'
import { razorpayProvider } from './razorpay-provider'

describe('selectProvider', () => {
  it('routes the IN region to Razorpay', () => {
    expect(selectProvider('IN')).toBe(razorpayProvider)
  })

  it('routes the GLOBAL region to Stripe', () => {
    expect(selectProvider('GLOBAL')).toBe(stripeProvider)
  })
})

describe('selectProvider composed with regionForCountry', () => {
  it('sends an Indian shipping address to Razorpay', () => {
    expect(selectProvider(regionForCountry('IN'))).toBe(razorpayProvider)
  })

  it('sends every other shipping address to Stripe', () => {
    for (const country of ['US', 'GB', 'AE', 'SG']) {
      expect(selectProvider(regionForCountry(country))).toBe(stripeProvider)
    }
  })

  // The two seams have to agree on casing, or an Indian customer silently pays
  // through the global gateway.
  it('still routes to Razorpay when the country code arrives lowercase', () => {
    expect(selectProvider(regionForCountry('in'))).toBe(razorpayProvider)
  })
})
