import { NextRequest, NextResponse } from 'next/server'

const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
const PROTECTED = ['/account', '/checkout', '/prescription-upload', '/order']
const ADMIN_ROLES = ['optometrist', 'admin']

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Edge middleware cannot import Node's 'crypto' module (only the Web Crypto
// API global is available here), but session.ts signs cookies with Node's
// createHmac('sha256', ...).digest('hex') — HMAC-SHA256 is a standard
// algorithm, so this produces an identical hex digest for the same key and
// message, keeping the two sides compatible.
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return toHex(signature)
}

async function decodeSessionCookie(cookieValue: string): Promise<{ customerId: string; role: string } | null> {
  const [data, sig] = cookieValue.split('.')
  if (!data || !sig) return null
  const expected = await hmacSha256Hex(SECRET, data)
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('session')

  if (pathname.startsWith('/admin')) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const session = await decodeSessionCookie(sessionCookie.value)
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
    if (!sessionCookie || !(await decodeSessionCookie(sessionCookie.value))) {
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
