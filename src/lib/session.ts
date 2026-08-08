import { createHmac } from 'crypto'
import { cookies } from 'next/headers'
import { requiredSecret } from './requiredSecret'
import { isUuid } from './uuid'

const SESSION_COOKIE = 'session'
const SECRET = requiredSecret('SESSION_SECRET')
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

interface SessionPayload {
  customerId: string
  role: string
  iat: number
}

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

function encode(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data)}`
}

function decode(token: string): SessionPayload | null {
  const [data, sig] = token.split('.')
  if (!data || !sig) return null
  if (sign(data) !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload

    // A signed cookie can outlive the id format. customer_id is a uuid column,
    // so a session carrying anything else reaches Postgres through the root
    // layout's wishlist provider — before any page guard can run — and 500s
    // every authenticated route. Failing closed here covers every consumer at
    // once, which a per-page check cannot.
    if (!payload?.customerId || !isUuid(payload.customerId)) return null

    return payload
  } catch {
    return null
  }
}

export function createSession(customerId: string, role = 'customer'): void {
  const token = encode({ customerId, role, iat: Date.now() })
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export function getSession(): { customerId: string; role: string } | null {
  const cookie = cookies().get(SESSION_COOKIE)
  if (!cookie) return null
  const payload = decode(cookie.value)
  if (!payload) return null
  return { customerId: payload.customerId, role: payload.role ?? 'customer' }
}

export function deleteSession(): void {
  cookies().delete(SESSION_COOKIE)
}
