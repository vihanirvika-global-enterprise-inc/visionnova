import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Auth from '@/lib/auth'
import { getSession } from '@/lib/session'
import { checkRateLimit } from '@/lib/rateLimit'
import { loginAction } from './actions'

vi.mock('@/lib/auth', () => ({
  loginUser: vi.fn(),
}))

vi.mock('@/lib/getClientIp', () => ({
  getClientIp: vi.fn().mockReturnValue('203.0.113.5'),
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

let mockSet: ReturnType<typeof vi.fn>
let mockGet: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockSet = vi.fn()
  mockGet = vi.fn()
  mockDelete = vi.fn()
  vi.spyOn(NextHeaders, 'cookies').mockReturnValue(
    { set: mockSet, get: mockGet, delete: mockDelete } as any
  )
  vi.mocked(checkRateLimit).mockReset().mockResolvedValue({ allowed: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

describe('loginAction', () => {
  it('checks the rate limit for the caller IP under the "login" key before anything else', async () => {
    await loginAction(makeFormData({ email: 'not-an-email', password: 'password123' }))
    expect(checkRateLimit).toHaveBeenCalledWith('203.0.113.5', 'login')
  })

  it('returns a friendly error and never calls loginUser when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 12 })

    const result = await loginAction(
      makeFormData({ email: 'user@example.com', password: 'correctpass' })
    )

    // Rate limiting belongs to no single input, so it is a form-level error.
    expect(result).toEqual({ formError: expect.stringContaining('12') })
    expect(Auth.loginUser).not.toHaveBeenCalled()
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('returns a field error when email is invalid', async () => {
    const result = await loginAction(
      makeFormData({ email: 'not-an-email', password: 'password123' })
    )

    expect(result.fieldErrors?.email?.[0]).toEqual(expect.any(String))
    expect(Auth.loginUser).not.toHaveBeenCalled()
  })

  // Enumeration safety: a wrong password and an unregistered address must be
  // indistinguishable, so this stays a generic form-level message and is
  // never attributed to the email field.
  it('returns a generic form-level error when credentials are wrong', async () => {
    vi.mocked(Auth.loginUser).mockResolvedValue(null)

    const result = await loginAction(
      makeFormData({ email: 'user@example.com', password: 'wrongpass' })
    )

    expect(result).toEqual({ formError: 'Invalid email or password' })
    expect(result.fieldErrors).toBeUndefined()
  })

  it('sets a session cookie and redirects on valid credentials', async () => {
    vi.mocked(Auth.loginUser).mockResolvedValue({
      id: 'cust-1', email: 'user@example.com',
      firstName: 'Ada', lastName: 'Lovelace',
      passwordHash: 'hash', phone: null, role: 'customer',
      createdAt: new Date(), updatedAt: new Date(),
    })

    await loginAction(
      makeFormData({ email: 'user@example.com', password: 'correctpass' })
    )

    expect(mockSet).toHaveBeenCalledWith(
      'session', expect.any(String), expect.objectContaining({ httpOnly: true })
    )
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/account')
  })

  // Regression proof for a live bug: createSession(customer.id) was called
  // without customer.role, so every session silently defaulted to
  // role: 'customer' regardless of the account's real role — bouncing real
  // optometrist/admin accounts off every /admin/* route at login time.
  describe.each(['customer', 'optometrist', 'ops', 'admin'] as const)(
    'when logging in as a %s',
    (role) => {
      it(`sets the session role to ${role}`, async () => {
        vi.mocked(Auth.loginUser).mockResolvedValue({
          id: 'cust-1', email: 'user@example.com',
          firstName: 'Ada', lastName: 'Lovelace',
          passwordHash: 'hash', phone: null, role,
          createdAt: new Date(), updatedAt: new Date(),
        })

        await loginAction(
          makeFormData({ email: 'user@example.com', password: 'correctpass' })
        )

        // Decode via the real (unmocked) getSession, feeding it the token
        // createSession actually wrote — proves the value round-trips
        // correctly through signing/encoding, not just that some argument
        // was passed somewhere.
        const [, token] = mockSet.mock.calls[0]
        mockGet.mockReturnValue({ value: token })

        expect(getSession()?.role).toBe(role)
      })
    }
  )
})
