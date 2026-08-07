import { describe, it, expect } from 'vitest'
import {
  isValidPinCode,
  normaliseIndianMobile,
  isValidIndianMobile,
  INDIAN_STATES,
  isValidIndianState,
  canonicaliseIndianState,
} from './indiaAddress'

describe('isValidPinCode', () => {
  it('accepts a six-digit PIN starting 1-9', () => {
    expect(isValidPinCode('520010')).toBe(true)
    expect(isValidPinCode('110001')).toBe(true)
    expect(isValidPinCode('999999')).toBe(true)
  })

  // India Post allocates the first digit as the postal region (1-9); a leading
  // zero identifies no region at all, so 000000-style filler has to fail even
  // though it is six digits long.
  it('rejects a PIN whose first digit is zero', () => {
    expect(isValidPinCode('000000')).toBe(false)
    expect(isValidPinCode('012345')).toBe(false)
  })

  it('rejects anything that is not exactly six digits', () => {
    expect(isValidPinCode('52001')).toBe(false)
    expect(isValidPinCode('5200101')).toBe(false)
    expect(isValidPinCode('')).toBe(false)
  })

  it('rejects digits mixed with other characters', () => {
    expect(isValidPinCode('52 010')).toBe(false)
    expect(isValidPinCode('520-10')).toBe(false)
    expect(isValidPinCode('52001A')).toBe(false)
  })

  // Pasted values routinely carry surrounding whitespace; that alone should
  // not be the reason a correct PIN is rejected.
  it('ignores surrounding whitespace', () => {
    expect(isValidPinCode('  520010 ')).toBe(true)
  })
})

describe('normaliseIndianMobile', () => {
  it('returns the ten digits unchanged when already canonical', () => {
    expect(normaliseIndianMobile('9876543210')).toBe('9876543210')
    expect(normaliseIndianMobile('6012345678')).toBe('6012345678')
  })

  it('strips a +91 country code', () => {
    expect(normaliseIndianMobile('+919876543210')).toBe('9876543210')
    expect(normaliseIndianMobile('919876543210')).toBe('9876543210')
  })

  it('strips a single leading zero', () => {
    expect(normaliseIndianMobile('09876543210')).toBe('9876543210')
  })

  // How a number arrives from a contacts app or a paste is not the customer's
  // problem — the separators carry no meaning, so they are removed rather
  // than being grounds for rejection.
  it('ignores spaces, hyphens and parentheses', () => {
    expect(normaliseIndianMobile('+91 98765 43210')).toBe('9876543210')
    expect(normaliseIndianMobile('98765-43210')).toBe('9876543210')
    expect(normaliseIndianMobile('(+91) 9876543210')).toBe('9876543210')
  })

  it('returns null when the leading digit is not 6-9', () => {
    expect(normaliseIndianMobile('5876543210')).toBeNull()
    expect(normaliseIndianMobile('1234567890')).toBeNull()
  })

  it('returns null on the wrong number of digits', () => {
    expect(normaliseIndianMobile('98765')).toBeNull()
    expect(normaliseIndianMobile('98765432101')).toBeNull()
    expect(normaliseIndianMobile('')).toBeNull()
  })

  // The reported defect: the Phone field accepted a door number verbatim.
  it('returns null for free-text address content', () => {
    expect(normaliseIndianMobile('22-1-53 A Balaji nagar')).toBeNull()
    expect(normaliseIndianMobile('9876543210 Balaji nagar')).toBeNull()
  })
})

describe('isValidIndianMobile', () => {
  it('accepts what normaliseIndianMobile can canonicalise', () => {
    expect(isValidIndianMobile('+91 98765 43210')).toBe(true)
    expect(isValidIndianMobile('9876543210')).toBe(true)
  })

  it('rejects what it cannot', () => {
    expect(isValidIndianMobile('22-1-53 A Balaji nagar')).toBe(false)
    expect(isValidIndianMobile('5876543210')).toBe(false)
  })
})

describe('INDIAN_STATES', () => {
  // 28 states + 8 union territories. Pinned as a count so a future edit that
  // drops or duplicates an entry fails here rather than silently shipping a
  // dropdown missing someone's state.
  it('lists all 36 states and union territories', () => {
    expect(INDIAN_STATES).toHaveLength(36)
  })

  it('holds no duplicates', () => {
    expect(new Set(INDIAN_STATES).size).toBe(INDIAN_STATES.length)
  })

  it('is sorted alphabetically, so the dropdown is scannable', () => {
    expect([...INDIAN_STATES]).toEqual([...INDIAN_STATES].sort())
  })
})

describe('isValidIndianState', () => {
  it('accepts a canonical name', () => {
    expect(isValidIndianState('Andhra Pradesh')).toBe(true)
    expect(isValidIndianState('Tamil Nadu')).toBe(true)
    expect(isValidIndianState('Lakshadweep')).toBe(true)
  })

  it('rejects a name that is not in the list', () => {
    expect(isValidIndianState('Andhrapradesh')).toBe(false)
    expect(isValidIndianState('Texas')).toBe(false)
    expect(isValidIndianState('')).toBe(false)
  })
})

describe('canonicaliseIndianState', () => {
  // Two callers need this: a legacy order whose state was free-typed, and the
  // India Post lookup, whose response has to be matched onto a dropdown option
  // before it can be selected.
  it('resolves case and spacing variants to the canonical name', () => {
    expect(canonicaliseIndianState('andhrapradesh')).toBe('Andhra Pradesh')
    expect(canonicaliseIndianState('ANDHRA PRADESH')).toBe('Andhra Pradesh')
    expect(canonicaliseIndianState('  tamil nadu ')).toBe('Tamil Nadu')
    expect(canonicaliseIndianState('west  bengal')).toBe('West Bengal')
  })

  it('returns the canonical name unchanged', () => {
    expect(canonicaliseIndianState('Kerala')).toBe('Kerala')
  })

  it('returns null for an unknown state', () => {
    expect(canonicaliseIndianState('Texas')).toBeNull()
    expect(canonicaliseIndianState('')).toBeNull()
  })
})
