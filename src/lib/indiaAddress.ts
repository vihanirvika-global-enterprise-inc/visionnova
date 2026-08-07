// India-specific address rules, kept apart from validation.ts so the generic
// address validator stays country-agnostic and these can be applied only when
// the shipping country is IN.

// India Post PIN: six digits, first digit 1-9 (the postal region). A leading
// zero identifies no region, which is what makes 000000-style filler invalid
// despite being the right length.
const PIN_CODE_REGEX = /^[1-9][0-9]{5}$/

export function isValidPinCode(pinCode: string): boolean {
  return PIN_CODE_REGEX.test(pinCode.trim())
}

// TRAI allocates mobile numbers in the 6-9 series; 10 digits, no area code.
const INDIAN_MOBILE_REGEX = /^[6-9][0-9]{9}$/

// Separators carry no meaning in a phone number, so a value pasted from a
// contacts app keeps its digits and loses its formatting. Anything else —
// including the letters in a pasted street address — survives this strip and
// is then rejected by the digit rules below, rather than being silently
// mangled into something that looks like a number.
const PHONE_SEPARATORS = /[\s\-()]/g

// Returns the canonical 10-digit form, or null when the input is not an
// Indian mobile number. Callers that only need a yes/no use
// isValidIndianMobile; callers that need to store the number use this, so the
// stored value never depends on how the customer happened to type it.
export function normaliseIndianMobile(raw: string): string | null {
  const compact = raw.trim().replace(PHONE_SEPARATORS, '')
  if (!/^\+?[0-9]+$/.test(compact)) return null

  const digits = compact.replace(/^\+/, '')

  // Both prefixes are 10 digits' worth of number with a fixed prefix ahead of
  // it, so they are only stripped when what remains is exactly 10 long —
  // otherwise an 11-digit typo could be "fixed" into a valid-looking number.
  const national =
    digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
    : digits

  return INDIAN_MOBILE_REGEX.test(national) ? national : null
}

export function isValidIndianMobile(raw: string): boolean {
  return normaliseIndianMobile(raw) !== null
}

// The 28 states and 8 union territories, alphabetical so the dropdown is
// scannable. Names follow the Union government's current usage — Dadra and
// Nagar Haveli and Daman and Diu is one territory since the 2020 merger, and
// Jammu and Kashmir and Ladakh have been separate since 2019.
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const

export type IndianState = (typeof INDIAN_STATES)[number]

export function isValidIndianState(state: string): state is IndianState {
  return (INDIAN_STATES as readonly string[]).includes(state)
}

// Case and internal spacing are how a state name gets mistyped ("andhrapradesh")
// and how an external source formats it differently; neither changes which
// state is meant. Comparing on letters alone resolves both without accepting
// a name that simply is not on the list.
function comparisonKey(state: string): string {
  return state.toLowerCase().replace(/[^a-z]/g, '')
}

const BY_COMPARISON_KEY = new Map(
  INDIAN_STATES.map((state) => [comparisonKey(state), state])
)

export function canonicaliseIndianState(raw: string): IndianState | null {
  return BY_COMPARISON_KEY.get(comparisonKey(raw)) ?? null
}
