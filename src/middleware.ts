import { NextRequest, NextResponse } from 'next/server'
import { isUuid } from '@/lib/uuid'
import { requiredSecret } from './lib/requiredSecret'

const SECRET = requiredSecret('SESSION_SECRET')
// Exact paths, not prefixes — see the comment at the use site.
const AUTH_PAGES = ['/login', '/register']

const PROTECTED = ['/account', '/checkout', '/prescription-upload', '/order', '/eye-test']
const ADMIN_ROLES = ['optometrist', 'admin']

// EP-010 BUG-009 (Risk LEG-04 — GDPR). The MVP is India-only with no GDPR
// programme (no EU consent flows, DPO, or Art. 27 representative), so serving
// EU data subjects is legal exposure with no business upside. GDPR's scope is
// the EEA, so the EEA trio (IS, LI, NO) is included — blocking the EU 27
// alone would leave identical exposure open. UK-GDPR is a separate regime and
// a separate business decision; GB is deliberately not listed.
const GDPR_BLOCKED_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
  'IS', 'LI', 'NO',
])
// Deliberately excludes 'optometrist' — that role already has /admin access
// to every customer's prescription; a B2B2C partner clinic must never
// inherit that. 'admin' is included for operational oversight only.
const PARTNER_ROLES = ['partner_optometrist', 'admin']

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
    // A signed payload with no customerId — or one that is not a uuid — is not
    // a usable session. customer_id is a uuid column, so anything else hands
    // downstream pages an id that throws at the database. Rejecting here means
    // the visitor is redirected to /login rather than served a 500.
    if (!payload?.customerId || !isUuid(payload.customerId)) return null
    return { customerId: payload.customerId, role: payload.role ?? 'customer' }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('session')

  // Geo-block before anything else. /api is exempt: those calls are
  // server-to-server (payment webhooks fire from processor infrastructure
  // that may sit in EU datacenters), not EU data subjects being served.
  // Fails open when the header is absent (local dev, self-hosted) — Vercel's
  // edge stamps it on every production request and strips inbound spoofs of
  // its own headers, so enforcement is real exactly where traffic is real.
  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase()
  if (country && GDPR_BLOCKED_COUNTRIES.has(country) && !pathname.startsWith('/api/')) {
    return new NextResponse(
      'VisionNova is not available in your region — we currently serve India only.',
      { status: 451, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    )
  }

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

  if (pathname.startsWith('/partner-portal')) {
    // Registration must stay reachable without a session — it's how a new
    // partner account gets created in the first place.
    if (pathname === '/partner-portal/register') {
      return NextResponse.next()
    }
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const session = await decodeSessionCookie(sessionCookie.value)
    if (!session || !PARTNER_ROLES.includes(session.role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    return NextResponse.next()
  }

  // A signed-in customer following a stale /login bookmark saw the sign-in
  // form again with no sign they were already authenticated. Handled here
  // rather than in each page: this is the one place that already decodes the
  // session, so the redirect costs no render.
  //
  // Exact matches only. /login/verify-otp is mid-flow — the pending-login
  // cookie is set but no session exists yet — and startsWith('/login') would
  // bounce someone out of the OTP step they are in the middle of.
  if (AUTH_PAGES.includes(pathname)) {
    if (sessionCookie && (await decodeSessionCookie(sessionCookie.value))) {
      return NextResponse.redirect(new URL('/account', request.url))
    }
    // A tampered or stale cookie is not a session: leave them on the form
    // rather than trapping them on a page they cannot use.
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

// Broadened from an allow-list of protected paths when the EU/EEA geo-block
// landed (EP-010 BUG-009): the block has to cover the whole site, not only
// authenticated areas. The session gates above are already path-scoped
// internally, so they behave identically under the wider matcher.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
