import type { Region } from '@/types'

export type CurrencyCode = 'INR' | 'USD'

// Currency follows the shipping region rather than whichever gateway happens to
// handle the payment. ISO-4217 uppercase; Stripe lowercases at its API boundary.
export function currencyForRegion(region: Region): CurrencyCode {
  return region === 'IN' ? 'INR' : 'USD'
}
