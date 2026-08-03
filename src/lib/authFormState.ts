import type { FieldErrors } from './validation'

// What the auth forms get back from a failed submit.
//
// formError is for problems that belong to no single input — a rate limit, or
// bad credentials, which must stay deliberately vague to avoid revealing
// whether an email is registered. fieldErrors is for problems the user can fix
// in a specific input, so the form can mark it invalid and focus it.
export interface AuthFormState {
  formError?: string
  fieldErrors?: FieldErrors
}
