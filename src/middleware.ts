import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
const PROTECTED = ['/account', '/checkout', '/prescription-upload', '/order']
const ADMIN_ROLES = ['optometrist', 'admin']

function decodeSessionCookie(cookieValue: string): { customerId: string; role: string } | null {
  const [data, sig] = cookieValue.split('.')
  if (!data || !sig) return null
  const expected = createHmac('sha256', SECRET).update(data).digest('hex')
  if (expected !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    // A signed payload with no customerId is not a usable session — treating
    // it as one hands downstream pages an undefined id to query with.
    if (!payload?.customerId) return null
    return { customerId: payload.customerId, role: payload.role ?? 'customer' }
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('session')

  if (pathname.startsWith('/admin')) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const session = decodeSessionCookie(sessionCookie.value)
    if (!session || !ADMIN_ROLES.includes(session.role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    return NextResponse.next()
  }

  const isProtected = PROTECTED.some((path) => pathname.startsWith(path))
  if (isProtected) {
    // Verify the signature here, not just the cookie's presence: a tampered
    // or stale cookie otherwise reached the page, where getSession() rejected
    // it and the customer got a 500 instead of a redirect.
    if (!sessionCookie || !decodeSessionCookie(sessionCookie.value)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/account/:path*',
    '/checkout/:path*',
    '/prescription-upload/:path*',
    '/order/:path*',
    '/admin/:path*',
  ],
}
