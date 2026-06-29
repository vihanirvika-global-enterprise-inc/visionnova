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

const VALID_TOKEN = 'dGVzdA.fakesig'
const CUSTOMER_TOKEN = makeSignedSession({ customerId: 'cust-001', role: 'customer' })
const OPTOMETRIST_TOKEN = makeSignedSession({ customerId: 'cust-002', role: 'optometrist' })
const ADMIN_TOKEN = makeSignedSession({ customerId: 'cust-003', role: 'admin' })

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

  it('allows requests with a session cookie to pass through', () => {
    const req = makeRequest('/account', VALID_TOKEN)
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
})
