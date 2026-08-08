import { describe, it, expect, vi, beforeEach } from 'vitest'

// A signed-in customer following a stale /login bookmark saw the sign-in form
// again, with no indication they were already authenticated. Handled in
// middleware rather than in each page: it is the one place that already
// decodes the session, and a redirect there costs no render.
describe('middleware — signed-in visitors on auth pages', () => {
  beforeEach(() => { vi.resetModules() })

  async function requestWith(pathname: string, cookieValue?: string) {
    const { middleware } = await import('./middleware')
    const { NextRequest } = await import('next/server')
    const request = new NextRequest(new URL(`http://localhost${pathname}`))
    if (cookieValue) request.cookies.set('session', cookieValue)
    return middleware(request)
  }

  // Same fixed secret middleware.test.ts uses — the middleware reads it via
  // requiredSecret at module load, which resolves to this default in test.
  async function validCookie(customerId = 'a58630d6-35ef-4135-8f79-c39c2e99fa4b') {
    const { createHmac } = await import('crypto')
    const payload = Buffer.from(
      JSON.stringify({ customerId, role: 'customer', iat: Date.now() })
    ).toString('base64url')
    const sig = createHmac('sha256', 'dev-secret-change-in-production').update(payload).digest('hex')
    return `${payload}.${sig}`
  }

  it.each(['/login', '/register'])('sends a signed-in visitor from %s to /account', async (path) => {
    const response = await requestWith(path, await validCookie())

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/account')
  })

  it.each(['/login', '/register'])('leaves an anonymous visitor on %s', async (path) => {
    const response = await requestWith(path)

    expect(response.status).toBe(200)
  })

  // A tampered or stale cookie is not a session. Redirecting on it would trap
  // someone whose cookie has gone bad on a page they cannot use.
  it('leaves a visitor with an invalid session cookie on /login', async () => {
    const response = await requestWith('/login', 'garbage.value')

    expect(response.status).toBe(200)
  })

  it('leaves a visitor whose session carries a non-uuid id on /login', async () => {
    const response = await requestWith('/login', await validCookie('cust-001'))

    expect(response.status).toBe(200)
  })

  // verify-otp is mid-flow: the pending-login cookie is set but no session
  // exists yet, so it must not be treated as an auth page to bounce from.
  it('does not redirect from the OTP step', async () => {
    const response = await requestWith('/login/verify-otp', await validCookie())

    expect(response.status).toBe(200)
  })
})
