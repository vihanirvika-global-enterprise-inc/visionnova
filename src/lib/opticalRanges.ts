// ST-023 (C3. Digital Rx Writing Tool — "form rejects out-of-range clinical
// values"). Standard optical practice bounds, not a business-specific
// policy — mirrors the DB-level CHECK constraints in
// prescriptions-add-clinical-range-constraints.sql, which are the backstop
// if this is ever bypassed. Kept as two independent layers deliberately:
// this is what the form actually uses for fast, field-level feedback.
const SPHERE_RANGE: [number, number] = [-20, 20]
const CYLINDER_RANGE: [number, number] = [-6, 6]
const AXIS_RANGE: [number, number] = [0, 180]
const ADD_RANGE: [number, number] = [0.75, 3.5]
const PD_RANGE: [number, number] = [40, 80]

// Exported so the write-rx form can state the accepted range beside each
// field. A form advertising a different range than the validator rejects on
// is worse than no hint at all — a clinician trusts what the field says.
export const OPTICAL_RANGES = {
  sphere: SPHERE_RANGE,
  cylinder: CYLINDER_RANGE,
  axis: AXIS_RANGE,
  add: ADD_RANGE,
  pupillaryDistance: PD_RANGE,
} as const

export interface OpticalValues {
  rightSphere?: number | null
  rightCylinder?: number | null
  rightAxis?: number | null
  rightAdd?: number | null
  leftSphere?: number | null
  leftCylinder?: number | null
  leftAxis?: number | null
  leftAdd?: number | null
  pupillaryDistance?: number | null
}

export interface OpticalValidationResult {
  valid: boolean
  errors: string[]
}

export function validateOpticalValues(values: OpticalValues): OpticalValidationResult {
  const errors: string[] = []

  function check(label: string, value: number | null | undefined, [min, max]: [number, number]) {
    // A field a customer's prescription doesn't need (e.g. no astigmatism,
    // no near-vision add) is omitted, not invalid — only bounds-check what
    // was actually entered.
    if (value === null || value === undefined) return
    if (value < min || value > max) {
      errors.push(`${label} must be between ${min} and ${max}`)
    }
  }

  check('Right sphere', values.rightSphere, SPHERE_RANGE)
  check('Left sphere', values.leftSphere, SPHERE_RANGE)
  check('Right cylinder', values.rightCylinder, CYLINDER_RANGE)
  check('Left cylinder', values.leftCylinder, CYLINDER_RANGE)
  check('Right axis', values.rightAxis, AXIS_RANGE)
  check('Left axis', values.leftAxis, AXIS_RANGE)
  check('Right add', values.rightAdd, ADD_RANGE)
  check('Left add', values.leftAdd, ADD_RANGE)
  check('Pupillary distance', values.pupillaryDistance, PD_RANGE)

  return { valid: errors.length === 0, errors }
}
