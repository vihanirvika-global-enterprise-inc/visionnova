// The shared result shape and collector, split out from validation.ts so
// modules that must stay client-safe can use them. validation.ts itself
// reaches the database (getCustomerByEmail), which makes it unimportable from
// a browser bundle.

export type FieldErrors = Record<string, string[]>

export interface ValidationResult {
  valid: boolean
  errors: string[]
  // Same messages as `errors`, keyed by the field they belong to, so a form
  // can mark the right input invalid and move focus to it. `errors` is kept
  // for callers that only need a flat list.
  fieldErrors: FieldErrors
}

// Collects messages per field and derives the flat list from them, so the two
// views can never disagree about what went wrong.
export function createErrorCollector() {
  const fieldErrors: FieldErrors = {}

  return {
    add(field: string, message: string) {
      ;(fieldErrors[field] ??= []).push(message)
    },
    result(): ValidationResult {
      const errors = Object.values(fieldErrors).flat()
      return { valid: errors.length === 0, errors, fieldErrors }
    },
  }
}
