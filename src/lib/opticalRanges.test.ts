import { describe, it, expect } from 'vitest'
import { validateOpticalValues, OPTICAL_RANGES } from './opticalRanges'

describe('validateOpticalValues', () => {
  it('is valid when every field is within range', () => {
    const result = validateOpticalValues({
      rightSphere: -1.5, rightCylinder: -0.75, rightAxis: 90, rightAdd: 1.5,
      leftSphere: -1.25, leftCylinder: -0.5, leftAxis: 100, leftAdd: 1.5,
      pupillaryDistance: 62,
    })
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('is valid when every field is omitted — not every prescription needs every field', () => {
    expect(validateOpticalValues({})).toEqual({ valid: true, errors: [] })
  })

  it.each([
    ['rightSphere', 25], ['rightSphere', -25],
    ['leftSphere', 25], ['leftSphere', -25],
  ])('rejects %s out of the +/-20.00D range', (field, value) => {
    const result = validateOpticalValues({ [field]: value })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/between -20 and 20/i)
  })

  it.each([
    ['rightCylinder', 8], ['rightCylinder', -8],
    ['leftCylinder', 8], ['leftCylinder', -8],
  ])('rejects %s out of the +/-6.00D range', (field, value) => {
    const result = validateOpticalValues({ [field]: value })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/between -6 and 6/i)
  })

  it.each([
    ['rightAxis', 200], ['rightAxis', -1],
    ['leftAxis', 181],
  ])('rejects %s outside 0-180', (field, value) => {
    const result = validateOpticalValues({ [field]: value })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/between 0 and 180/i)
  })

  it.each([
    ['rightAdd', 5], ['rightAdd', 0.5],
    ['leftAdd', 5],
  ])('rejects %s outside 0.75-3.50', (field, value) => {
    const result = validateOpticalValues({ [field]: value })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/between 0.75 and 3.5/i)
  })

  it('rejects pupillary distance outside 40-80mm', () => {
    expect(validateOpticalValues({ pupillaryDistance: 100 }).valid).toBe(false)
    expect(validateOpticalValues({ pupillaryDistance: 20 }).valid).toBe(false)
  })

  it('collects every out-of-range error at once, not just the first', () => {
    const result = validateOpticalValues({ rightSphere: 25, leftAxis: 200 })
    expect(result.errors).toHaveLength(2)
  })

  it('accepts boundary values as valid, not just values strictly inside the range', () => {
    const result = validateOpticalValues({
      rightSphere: 20, leftSphere: -20, rightAxis: 0, leftAxis: 180,
      rightAdd: 0.75, leftAdd: 3.5, pupillaryDistance: 40,
    })
    expect(result.valid).toBe(true)
  })
})

// The write-rx form states the accepted range beside each field. Exporting
// the bounds means the hint cannot drift from what validateOpticalValues
// actually enforces — a form that advertises a different range than the
// validator rejects is worse than no hint, because a clinician trusts it.
describe('OPTICAL_RANGES', () => {
  it('exposes a range for every field the validator checks', () => {
    for (const key of ['sphere', 'cylinder', 'axis', 'add', 'pupillaryDistance'] as const) {
      expect(OPTICAL_RANGES[key]).toHaveLength(2)
    }
  })

  it('is the same bound the validator rejects on', () => {
    const [min, max] = OPTICAL_RANGES.sphere

    expect(validateOpticalValues({ rightSphere: min }).valid).toBe(true)
    expect(validateOpticalValues({ rightSphere: max }).valid).toBe(true)
    expect(validateOpticalValues({ rightSphere: min - 0.25 }).valid).toBe(false)
    expect(validateOpticalValues({ rightSphere: max + 0.25 }).valid).toBe(false)
  })

  it('agrees with the validator on every other field too', () => {
    const cases: Array<[keyof typeof OPTICAL_RANGES, (v: number) => Parameters<typeof validateOpticalValues>[0]]> = [
      ['cylinder', (v) => ({ rightCylinder: v })],
      ['axis', (v) => ({ rightAxis: v })],
      ['add', (v) => ({ rightAdd: v })],
      ['pupillaryDistance', (v) => ({ pupillaryDistance: v })],
    ]

    for (const [key, build] of cases) {
      const [min, max] = OPTICAL_RANGES[key]
      expect(validateOpticalValues(build(min)).valid).toBe(true)
      expect(validateOpticalValues(build(max)).valid).toBe(true)
      expect(validateOpticalValues(build(max + 1)).valid).toBe(false)
    }
  })
})
