import { randomInt, createHash } from 'crypto'
import { sql } from './db'

const OTP_LENGTH = 6
const EXPIRY_MS = 5 * 60_000

// ST-013 (A13. Auth — "OTP expires after 5 minutes and is rate-limited").
// Rate limiting is enforced at the action layer (checkRateLimit, same lib
// login/register already use) — this module only owns generation, hashed
// storage, and single-use verification.
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0')
}

// SHA-256, not bcrypt: unlike a password, an OTP is short-lived (5 min) and
// already rate-limited against guessing, so it doesn't need bcrypt's
// deliberate slowness — a fast hash is the right tool for a value this
// short-lived, the same reasoning session tokens use.
function hashOtpCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export async function createLoginOtp(customerId: string): Promise<{ code: string }> {
  const code = generateOtpCode()
  const codeHash = hashOtpCode(code)
  const expiresAt = new Date(Date.now() + EXPIRY_MS)

  await sql`
    INSERT INTO login_otps (customer_id, code_hash, expires_at)
    VALUES (${customerId}, ${codeHash}, ${expiresAt})
  `

  return { code }
}

// Single-use: the matching row is marked consumed in the same call, so a
// captured code (e.g. from a compromised mailbox) can't be replayed even
// within its 5-minute window.
export async function verifyLoginOtp(customerId: string, code: string): Promise<boolean> {
  const codeHash = hashOtpCode(code)

  const rows = await sql`
    SELECT id FROM login_otps
    WHERE customer_id = ${customerId}
      AND code_hash = ${codeHash}
      AND consumed_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (rows.length === 0) return false

  await sql`UPDATE login_otps SET consumed_at = NOW() WHERE id = ${rows[0].id}`
  return true
}
