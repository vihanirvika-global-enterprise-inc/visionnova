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
const PARTNER_TOKEN = makeSignedSession({ customerId: 'cust-005', role: 'partner_optometrist' })

describe('middleware', () => {
  it('redirects unauthenticated requests to /account to /login', async () => {
    const req = makeRequest('/account')
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects unauthenticated requests to /checkout to /login', async () => {
    const req = makeRequest('/checkout')
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects unauthenticated requests to /prescription-upload to /login', async () => {
    const req = makeRequest('/prescription-upload')
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('allows requests with a validly signed session cookie to pass through', async () => {
    const req = makeRequest('/account', CUSTOMER_TOKEN)
    const res = await middleware(req)

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
  ])('redirects a tampered session cookie on %s to /login, not through to a 500', async (path) => {
    const req = makeRequest(path, TAMPERED_TOKEN)
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects a cookie whose payload was swapped but signature left stale', async () => {
    const [, signature] = CUSTOMER_TOKEN.split('.')
    const forgedPayload = Buffer.from(
      JSON.stringify({ customerId: 'cust-victim', role: 'customer', iat: Date.now() })
    ).toString('base64url')

    const req = makeRequest('/account', `${forgedPayload}.${signature}`)
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it.each([
    ['no separator', 'garbagewithnodot'],
    ['empty string', ''],
    ['signature only', '.onlysig'],
    ['payload only', 'onlypayload.'],
    ['non-base64 payload', '!!!not-base64!!!.deadbeef'],
  ])('redirects a malformed cookie (%s) rather than throwing', async (_label, token) => {
    const req = makeRequest('/account', token)
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  // Unprotected routes must stay reachable regardless of cookie state — a
  // stale cookie shouldn't lock someone out of the storefront.
  it('leaves unprotected routes alone even with a tampered cookie', async () => {
    const req = makeRequest('/shop', TAMPERED_TOKEN)
    const res = await middleware(req)

    expect(res.status).toBe(200)
  })
})

describe('middleware — admin guard', () => {
  it('redirects unauthenticated requests to /admin/* to /login', async () => {
    const req = makeRequest('/admin/prescriptions')
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects customer role to /admin/* to /unauthorized', async () => {
    const req = makeRequest('/admin/prescriptions', CUSTOMER_TOKEN)
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/unauthorized')
  })

  it('allows optometrist role through /admin/*', async () => {
    const req = makeRequest('/admin/prescriptions', OPTOMETRIST_TOKEN)
    const res = await middleware(req)

    expect(res.status).toBe(200)
  })

  it('allows admin role through /admin/*', async () => {
    const req = makeRequest('/admin/prescriptions', ADMIN_TOKEN)
    const res = await middleware(req)

    expect(res.status).toBe(200)
  })

  // Deliberate, not an oversight: no /ops/* surface exists yet in this app,
  // so ops does not get /admin/* access as a side effect of this fix. When a
  // real ops-scoped area gets built, it needs its own explicit gate.
  it('redirects ops role away from /admin/* — no ops-scoped area exists yet', async () => {
    const req = makeRequest('/admin/prescriptions', OPS_TOKEN)
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/unauthorized')
  })
})

// ST-021 (EP-007). The whole point of this guard: 'optometrist' must never
// get in here, even though it's an ADMIN_ROLES member — this is a
// deliberately separate role list, not a widening of the admin gate.
describe('middleware — partner portal guard', () => {
  it('allows unauthenticated requests to /partner-portal/register through — it is the signup form', async () => {
    const req = makeRequest('/partner-portal/register')
    const res = await middleware(req)

    expect(res.status).toBe(200)
  })

  it('redirects unauthenticated requests to other /partner-portal/* routes to /login', async () => {
    const req = makeRequest('/partner-portal/dashboard')
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects customer role to /partner-portal/* to /unauthorized', async () => {
    const req = makeRequest('/partner-portal/dashboard', CUSTOMER_TOKEN)
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/unauthorized')
  })

  it('redirects the internal optometrist reviewer role away from /partner-portal/* — it must not inherit partner access', async () => {
    const req = makeRequest('/partner-portal/dashboard', OPTOMETRIST_TOKEN)
    const res = await middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/unauthorized')
  })

  it('allows partner_optometrist role through /partner-portal/*', async () => {
    const req = makeRequest('/partner-portal/dashboard', PARTNER_TOKEN)
    const res = await middleware(req)

    expect(res.status).toBe(200)
  })

  it('allows admin role through /partner-portal/* for oversight', async () => {
    const req = makeRequest('/partner-portal/dashboard', ADMIN_TOKEN)
    const res = await middleware(req)

    expect(res.status).toBe(200)
  })
})
