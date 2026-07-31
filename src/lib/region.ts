import type { Region } from '@/types'

// The seam payment-provider selection keys on: India is served by a domestic
// gateway, everywhere else by the global one.
export function regionForCountry(countryCode: string): Region {
  return countryCode.trim().toUpperCase() === 'IN' ? 'IN' : 'GLOBAL'
}
