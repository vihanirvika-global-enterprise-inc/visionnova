import { createHmac } from 'crypto'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'session'
const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

interface SessionPayload {
  customerId: string
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
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function createSession(customerId: string): void {
  const token = encode({ customerId, iat: Date.now() })
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export function getSession(): { customerId: string } | null {
  const cookie = cookies().get(SESSION_COOKIE)
  if (!cookie) return null
  const payload = decode(cookie.value)
  if (!payload) return null
  return { customerId: payload.customerId }
}

export function deleteSession(): void {
  cookies().delete(SESSION_COOKIE)
}
