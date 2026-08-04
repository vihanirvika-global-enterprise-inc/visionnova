// Single accessor for secrets that must never be defaulted in production.
//
// Five modules previously did `process.env.X ?? 'dev-secret-change-in-production'`
// independently. With the variable unset, a production deploy still booted and
// signed sessions — and encrypted prescription and KYC files — with a constant
// published in this repository: session forgery and health-data decryption
// would both have been trivial for anyone with source access, with no error
// anywhere to reveal it.
//
// Fail-closed in production, fall back outside it. This mirrors checkRateLimit
// in ./rateLimit, which uses the same `NODE_ENV === 'production'` test to
// decide between throwing and degrading — a missing protective control must
// be loud in production and invisible in local development.
//
// Deliberately Edge-safe: src/middleware.ts runs in the Edge Runtime, so this
// module must touch nothing beyond process.env.

// Distinctive on purpose. If this string ever appears in a log line, a session
// token or a ciphertext dump, the cause is unambiguous.
export const DEV_SECRET_FALLBACK = 'dev-secret-change-in-production'

/**
 * @param name Environment variable to read, e.g. 'SESSION_SECRET'.
 * @returns The configured secret, or the development fallback outside production.
 * @throws In production when the variable is unset or empty.
 */
export function requiredSecret(name: string): string {
  const value = process.env[name]

  // Empty string counts as unset: an env var exported as "" would otherwise
  // sign every session with a zero-length key.
  if (value) return value

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${name} is not set. It is required in production — refusing to fall back ` +
        'to the development secret, which is published in this repository.',
    )
  }

  return DEV_SECRET_FALLBACK
}
