import { createHmac } from 'crypto'
import { cookies } from 'next/headers'

const PENDING_LOGIN_COOKIE = 'pending_login'
const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
// Long enough to read an email and type a 6-digit code, short enough that a
// stale pending login can't be resurrected much later.
const MAX_AGE = 60 * 10

interface PendingLoginPayload {
  customerId: string
  role: string
  iat: number
}

// ST-013: mirrors session.ts's own sign/encode/decode shape deliberately —
// same HMAC-signed, httpOnly cookie approach, but a distinct cookie name and
// a much shorter lifetime, since this represents "password verified,
// awaiting OTP" rather than an authenticated session. Kept as its own file
// rather than folded into session.ts so the real session contract (used by
// the auth middleware) is never at risk of being loosened by this addition.
function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

function encode(payload: PendingLoginPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data)}`
}

function decode(token: string): PendingLoginPayload | null {
  const [data, sig] = token.split('.')
  if (!data || !sig) return null
  if (sign(data) !== sig) return null
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function createPendingLogin(customerId: string, role: string): void {
  const token = encode({ customerId, role, iat: Date.now() })
  cookies().set(PENDING_LOGIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export function getPendingLogin(): { customerId: string; role: string } | null {
  const cookie = cookies().get(PENDING_LOGIN_COOKIE)
  if (!cookie) return null
  const payload = decode(cookie.value)
  if (!payload?.customerId) return null
  return { customerId: payload.customerId, role: payload.role ?? 'customer' }
}

export function clearPendingLogin(): void {
  cookies().delete(PENDING_LOGIN_COOKIE)
}
