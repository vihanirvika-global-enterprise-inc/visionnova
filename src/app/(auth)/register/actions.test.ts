import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Auth from '@/lib/auth'
import { getSession } from '@/lib/session'
import { checkRateLimit } from '@/lib/rateLimit'
import { registerAction } from './actions'

// DuplicateEmailError is re-exported from the real module (not stubbed) so
// registerAction's `instanceof DuplicateEmailError` check works against the
// same class reference the test constructs instances of.
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    registerUser: vi.fn(),
    DuplicateEmailError: actual.DuplicateEmailError,
  }
})

// Without this, validateRegistration's real breach-check would make a live
// network call to HIBP on every test run.
vi.mock('@/lib/breachCheck', () => ({
  checkBreached: vi.fn().mockResolvedValue(false),
}))

// Without this, validateRegistration's real email-uniqueness precheck would
// hit the real DB (and fail outright — no DATABASE_URL in the test env).
vi.mock('@/lib/customers', () => ({
  getCustomerByEmail: vi.fn().mockResolvedValue(null),
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

const validFields = {
  firstName: 'Ada', lastName: 'Lovelace',
  email: 'ada@example.com', password: 'password123',
}

describe('registerAction', () => {
  it('checks the rate limit for the caller IP under the "register" key before anything else', async () => {
    await registerAction(makeFormData({ ...validFields, email: 'not-an-email' }))
    expect(checkRateLimit).toHaveBeenCalledWith('203.0.113.5', 'register')
  })

  it('returns a friendly error and never calls registerUser when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 37 })

    const result = await registerAction(makeFormData(validFields))

    // Rate limiting belongs to no single input, so it is a form-level error.
    expect(result).toEqual({ formError: expect.stringContaining('37') })
    expect(Auth.registerUser).not.toHaveBeenCalled()
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('returns a field error when email is invalid', async () => {
    const result = await registerAction(
      makeFormData({ ...validFields, email: 'not-an-email' })
    )

    expect(result.fieldErrors?.email?.[0]).toEqual(expect.any(String))
    expect(Auth.registerUser).not.toHaveBeenCalled()
  })

  it('returns an error when password is too short', async () => {
    const result = await registerAction(
      makeFormData({ ...validFields, password: 'short' })
    )

    expect(result.fieldErrors?.password?.[0]).toEqual(expect.any(String))
    expect(Auth.registerUser).not.toHaveBeenCalled()
  })

  // Every problem is returned at once, so a user is not sent round-tripping
  // to discover them one at a time — and the breach warning, which used to be
  // last in the list, can no longer be hidden by an earlier error.
  it('returns errors for every invalid field in one response', async () => {
    const result = await registerAction(
      makeFormData({ firstName: '', lastName: '', email: 'not-an-email', password: 'short' })
    )

    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(
      ['email', 'firstName', 'lastName', 'password']
    )
  })

  // validateRegistration's own precheck normally catches this before
  // registerUser is ever called (covered in validation.test.ts) — this test
  // is specifically for the DB-constraint backstop path: registerUser
  // reached the DB and got a DuplicateEmailError back.
  it('returns a friendly error, not a crash, when registerUser throws DuplicateEmailError', async () => {
    vi.mocked(Auth.registerUser).mockRejectedValue(new Auth.DuplicateEmailError())

    const result = await registerAction(makeFormData(validFields))

    expect(result).toEqual({ fieldErrors: { email: ['Email already registered'] } })
    expect(NextNavigation.redirect).not.toHaveBeenCalled()
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('sets a session cookie and redirects on successful registration', async () => {
    vi.mocked(Auth.registerUser).mockResolvedValue({
      id: 'cust-1', email: 'ada@example.com',
      firstName: 'Ada', lastName: 'Lovelace',
      passwordHash: 'hash', phone: null, role: 'customer',
      createdAt: new Date(), updatedAt: new Date(),
    })

    await registerAction(makeFormData(validFields))

    expect(mockSet).toHaveBeenCalledWith(
      'session', expect.any(String), expect.objectContaining({ httpOnly: true })
    )
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/account')
  })

  // Regression-proofing, not a currently-observable bug: self-registration
  // can only ever produce role: 'customer' today (createCustomer has no role
  // input), so this can't fail for a real user yet. But registerAction
  // itself should still pass through whatever role registerUser returns —
  // "harmless today" stops being true the moment an admin-invite or
  // optometrist-onboarding flow starts producing non-customer accounts here.
  describe.each(['customer', 'optometrist', 'ops', 'admin'] as const)(
    'when registerUser resolves with role %s',
    (role) => {
      it(`sets the session role to ${role}`, async () => {
        vi.mocked(Auth.registerUser).mockResolvedValue({
          id: 'cust-1', email: 'ada@example.com',
          firstName: 'Ada', lastName: 'Lovelace',
          passwordHash: 'hash', phone: null, role,
          createdAt: new Date(), updatedAt: new Date(),
        })

        await registerAction(makeFormData(validFields))

        const [, token] = mockSet.mock.calls[0]
        mockGet.mockReturnValue({ value: token })

        expect(getSession()?.role).toBe(role)
      })
    }
  )
})
