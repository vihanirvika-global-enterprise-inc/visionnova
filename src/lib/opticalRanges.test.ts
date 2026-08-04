import { describe, it, expect } from 'vitest'
import { validateOpticalValues } from './opticalRanges'

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
