import { MIN_PASSWORD_LENGTH } from './passwordPolicy'

// The server enforces exactly two things: a minimum length, and that the
// password has not appeared in a known breach (validation.ts). Nothing else.
//
// So this meter reports those two and nothing else. The mockup's bar scored
// digits and symbols, which would tell someone their password is "weak" for
// failing a rule we do not have — and imply that adding a symbol is required
// when it is not. A meter that disagrees with the validator is worse than no
// meter, because the person believes it.
//
// Beyond the minimum the wording is explicitly advice, not a requirement:
// length is the only property we can honestly comment on without an opinion
// the validator does not hold.
export type PasswordStrength = {
  // Whether the password meets what the server will actually enforce.
  meetsPolicy: boolean
  label: string
  // 0–100, for the bar. Below the minimum this is progress toward it, so the
  // bar reads as "how close am I", not "how good is this".
  percent: number
}

const ADVISORY_STRONG_LENGTH = 16

export function describePasswordStrength(password: string): PasswordStrength | null {
  if (password.length === 0) return null

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      meetsPolicy: false,
      label: `Too short — ${MIN_PASSWORD_LENGTH - password.length} more character${
        MIN_PASSWORD_LENGTH - password.length === 1 ? '' : 's'
      } needed`,
      percent: Math.round((password.length / MIN_PASSWORD_LENGTH) * 100),
    }
  }

  if (password.length >= ADVISORY_STRONG_LENGTH) {
    return { meetsPolicy: true, label: 'Meets the minimum · a long passphrase like this is hard to guess', percent: 100 }
  }

  return { meetsPolicy: true, label: 'Meets the minimum length', percent: 70 }
}
