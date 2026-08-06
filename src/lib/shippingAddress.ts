// Shipping-address validation, kept in its own module so the checkout form
// can run exactly the same rules in the browser that checkoutAction runs on
// the server. validation.ts cannot be imported from a client component — it
// reaches the database — and a second, browser-only copy of these rules would
// drift from this one the first time either changed.
import { isValidCountryCode } from './countries'
import { isValidPinCode, isValidIndianState, isValidIndianMobile } from './indiaAddress'
import { createErrorCollector, type ValidationResult } from './validationResult'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ShippingAddressInput {
  fullName: string
  email: string
  phone: string
  line1: string
  // A flat or door number is not always needed, so this stays optional — the
  // only field on the form that is.
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export function validateShippingAddress(input: ShippingAddressInput): ValidationResult {
  const collector = createErrorCollector()

  if (!input.fullName.trim()) collector.add('fullName', 'Full name is required')
  if (!EMAIL_REGEX.test(input.email.trim())) {
    collector.add('email', 'Enter a valid email address')
  }
  if (!input.line1.trim()) collector.add('line1', 'Street address is required')
  if (!input.city.trim()) collector.add('city', 'City is required')
  if (!isValidCountryCode(input.country)) collector.add('country', 'A valid country is required')

  // Applied per-country, not globally: this validator still serves the whole
  // COUNTRIES list for orders placed before a region closed, and a PIN-code
  // rule would reject every one of them. India is the only serviceable region
  // today (see serviceableRegions.ts), so in practice this is the path that
  // runs — but the generic branch has to stay correct.
  if (input.country === 'IN') {
    if (!isValidPinCode(input.postalCode)) {
      collector.add('postalCode', 'Enter a valid 6-digit PIN code')
    }
    if (!isValidIndianState(input.state)) {
      collector.add('state', 'Select a valid Indian state or union territory')
    }
    if (!isValidIndianMobile(input.phone)) {
      collector.add('phone', 'Enter a valid 10-digit Indian mobile number')
    }
  } else {
    if (!input.postalCode.trim()) {
      collector.add('postalCode', 'Postal code is required')
    }
    // Outside India there is no single national format worth enforcing, so
    // the bar is only that a courier has something to call.
    if (!input.phone.trim()) {
      collector.add('phone', 'Phone number is required')
    }
  }

  return collector.result()
}
