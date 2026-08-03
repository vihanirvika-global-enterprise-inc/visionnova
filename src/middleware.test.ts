import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

function makeRequest(path: string, sessionToken?: string): NextRequest {
  const url = `http://localhost${path}`
  const req = new NextRequest(url)
  if (sessionToken) {
    req.cookies.set('session', sessionToken)
  }
  return req
}

function makeSignedSession(payload: { customerId: string; role: string }): string {
  const secret = 'dev-secret-change-in-production'
  const data = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url')
  const sig = createHmac('sha256', secret).update(data).digest('hex')
  return `${data}.${sig}`
}

// Correctly base64url-encoded payload, but signed with nothing valid — this
// is what a tampered or forged cookie actually looks like on the wire.
const TAMPERED_TOKEN = 'dGVzdA.fakesig'
const CUSTOMER_TOKEN = makeSignedSession({ customerId: 'cust-001', role: 'customer' })
const OPTOMETRIST_TOKEN = makeSignedSession({ customerId: 'cust-002', role: 'optometrist' })
const ADMIN_TOKEN = makeSignedSession({ customerId: 'cust-003', role: 'admin' })
const OPS_TOKEN = makeSignedSession({ customerId: 'cust-004', role: 'ops' })

describe('middleware', () => {
  it('redirects unauthenticated requests to /account to /login', () => {
    const req = makeRequest('/account')
    const res = middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects unauthenticated requests to /checkout to /login', () => {
    const req = makeRequest('/checkout')
    const res = middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects unauthenticated requests to /prescription-upload to /login', () => {
    const req = makeRequest('/prescription-upload')
    const res = middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('allows requests with a validly signed session cookie to pass through', () => {
    const req = makeRequest('/account', CUSTOMER_TOKEN)
    const res = middleware(req)

    expect(res.status).toBe(200)
  })
})

// The signature check is what separates a real session from a forged one.
// Without it here, a tampered cookie passed middleware and only failed later
// at getSession(), surfacing to the customer as a 500 instead of a redirect.
describe('middleware — signature verification on protected non-admin routes', () => {
  it.each([
    '/account',
    '/checkout',
    '/prescription-upload',
    '/order/order-001',
  ])('redirects a tampered session cookie on %s to /login, not through to a 500', (path) => {
    const req = makeRequest(path, TAMPERED_TOKEN)
    const res = middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects a cookie whose payload was swapped but signature left stale', () => {
    const [, signature] = CUSTOMER_TOKEN.split('.')
    const forgedPayload = Buffer.from(
      JSON.stringify({ customerId: 'cust-victim', role: 'customer', iat: Date.now() })
    ).toString('base64url')

    const req = makeRequest('/account', `${forgedPayload}.${signature}`)
    const res = middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it.each([
    ['no separator', 'garbagewithnodot'],
    ['empty string', ''],
    ['signature only', '.onlysig'],
    ['payload only', 'onlypayload.'],
    ['non-base64 payload', '!!!not-base64!!!.deadbeef'],
  ])('redirects a malformed cookie (%s) rather than throwing', (_label, token) => {
    const req = makeRequest('/account', token)
    const res = middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  // Unprotected routes must stay reachable regardless of cookie state — a
  // stale cookie shouldn't lock someone out of the storefront.
  it('leaves unprotected routes alone even with a tampered cookie', () => {
    const req = makeRequest('/shop', TAMPERED_TOKEN)
    const res = middleware(req)

    expect(res.status).toBe(200)
  })
})

describe('middleware — admin guard', () => {
  it('redirects unauthenticated requests to /admin/* to /login', () => {
    const req = makeRequest('/admin/prescriptions')
    const res = middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects customer role to /admin/* to /unauthorized', () => {
    const req = makeRequest('/admin/prescriptions', CUSTOMER_TOKEN)
    const res = middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/unauthorized')
  })

  it('allows optometrist role through /admin/*', () => {
    const req = makeRequest('/admin/prescriptions', OPTOMETRIST_TOKEN)
    const res = middleware(req)

    expect(res.status).toBe(200)
  })

  it('allows admin role through /admin/*', () => {
    const req = makeRequest('/admin/prescriptions', ADMIN_TOKEN)
    const res = middleware(req)

    expect(res.status).toBe(200)
  })

  // Deliberate, not an oversight: no /ops/* surface exists yet in this app,
  // so ops does not get /admin/* access as a side effect of this fix. When a
  // real ops-scoped area gets built, it needs its own explicit gate.
  it('redirects ops role away from /admin/* — no ops-scoped area exists yet', () => {
    const req = makeRequest('/admin/prescriptions', OPS_TOKEN)
    const res = middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/unauthorized')
  })
})
