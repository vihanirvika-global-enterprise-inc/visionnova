import { describe, it, expect } from 'vitest'
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

const VALID_TOKEN = 'dGVzdA.fakesig'

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
