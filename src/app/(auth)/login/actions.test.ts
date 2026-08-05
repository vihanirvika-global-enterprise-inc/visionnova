import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Auth from '@/lib/auth'
import * as LoginOtp from '@/lib/loginOtp'
import * as Email from '@/lib/email'
import { getPendingLogin } from '@/lib/pendingLogin'
import { checkRateLimit } from '@/lib/rateLimit'
import { loginAction } from './actions'

vi.mock('@/lib/auth', () => ({
  loginUser: vi.fn(),
}))

vi.mock('@/lib/loginOtp', () => ({
  createLoginOtp: vi.fn(),
  deleteLoginOtp: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendLoginOtpEmail: vi.fn(),
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
  vi.clearAllMocks()
  mockSet = vi.fn()
  mockGet = vi.fn()
  mockDelete = vi.fn()
  vi.spyOn(NextHeaders, 'cookies').mockReturnValue(
    { set: mockSet, get: mockGet, delete: mockDelete } as any
  )
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true })
  vi.mocked(LoginOtp.createLoginOtp).mockResolvedValue({ code: '123456', id: 'otp-1' })
  vi.mocked(Email.sendLoginOtpEmail).mockResolvedValue({} as any)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

function mockCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cust-1', email: 'user@example.com',
    firstName: 'Ada', lastName: 'Lovelace',
    passwordHash: 'hash', phone: null, role: 'customer' as const,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
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

  it('sends an OTP and redirects to verify-otp on valid credentials, without creating a session yet', async () => {
    vi.mocked(Auth.loginUser).mockResolvedValue(mockCustomer())

    await loginAction(
      makeFormData({ email: 'user@example.com', password: 'correctpass' })
    )

    expect(LoginOtp.createLoginOtp).toHaveBeenCalledWith('cust-1')
    expect(Email.sendLoginOtpEmail).toHaveBeenCalledWith({
      to: 'user@example.com', firstName: 'Ada', code: '123456',
    })
    expect(mockSet).toHaveBeenCalledWith(
      'pending_login', expect.any(String), expect.objectContaining({ httpOnly: true })
    )
    expect(mockSet).not.toHaveBeenCalledWith('session', expect.anything(), expect.anything())
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/login/verify-otp')
  })

  it('returns a form error and does not redirect when the OTP email fails to send', async () => {
    vi.mocked(Auth.loginUser).mockResolvedValue(mockCustomer())
    vi.mocked(Email.sendLoginOtpEmail).mockRejectedValue(new Error('Resend outage'))

    const result = await loginAction(
      makeFormData({ email: 'user@example.com', password: 'correctpass' })
    )

    expect(result).toEqual({ formError: expect.any(String) })
    expect(mockSet).not.toHaveBeenCalled()
    expect(NextNavigation.redirect).not.toHaveBeenCalled()
  })

  // Regression proof for a live bug (pre-OTP): createSession(customer.id) was
  // called without customer.role, so every session silently defaulted to
  // role: 'customer'. Same risk now applies to the pending-login cookie —
  // its role must round-trip correctly to whatever verifyOtpAction later
  // creates the real session with.
  describe.each(['customer', 'optometrist', 'ops', 'admin'] as const)(
    'when logging in as a %s',
    (role) => {
      it(`carries role ${role} forward in the pending login`, async () => {
        vi.mocked(Auth.loginUser).mockResolvedValue(mockCustomer({ role }))

        await loginAction(
          makeFormData({ email: 'user@example.com', password: 'correctpass' })
        )

        // Decode via the real (unmocked) getPendingLogin, feeding it the
        // token createPendingLogin actually wrote — proves the value
        // round-trips correctly through signing/encoding.
        const [, token] = mockSet.mock.calls[0]
        mockGet.mockReturnValue({ value: token })

        expect(getPendingLogin()?.role).toBe(role)
      })
    }
  )
})

// The OTP row is written before the mail is attempted, so every send failure
// leaves one behind. Deleting it keeps login_otps from accumulating rows for
// codes that were never delivered; it is hygiene, not a security control —
// rate limiting is per IP+endpoint (checkRateLimit), so a stale row consumes
// no quota and grants nothing.
describe('loginAction — OTP dispatch failure', () => {
  const CREDENTIALS = { email: 'user@example.com', password: 'Str0ngPassw0rd!' }
  const EXPECTED_MESSAGE = 'Could not send a verification code. Please try again.'

  beforeEach(() => {
    vi.mocked(Auth.loginUser).mockResolvedValue(mockCustomer())
    vi.mocked(LoginOtp.createLoginOtp).mockResolvedValue({ code: '123456', id: 'otp-1' })
  })

  it('returns a form error and does not redirect when the send throws', async () => {
    vi.mocked(Email.sendLoginOtpEmail).mockRejectedValue(new Error('socket hang up'))

    const result = await loginAction(makeFormData(CREDENTIALS))

    expect(result).toEqual({ formError: EXPECTED_MESSAGE })
    expect(NextNavigation.redirect).not.toHaveBeenCalled()
  })

  it('deletes the orphaned OTP row when the send throws', async () => {
    vi.mocked(Email.sendLoginOtpEmail).mockRejectedValue(new Error('socket hang up'))

    await loginAction(makeFormData(CREDENTIALS))

    expect(LoginOtp.deleteLoginOtp).toHaveBeenCalledWith('otp-1')
  })

  it('leaves the OTP row in place when the send succeeds', async () => {
    vi.mocked(Email.sendLoginOtpEmail).mockResolvedValue({} as any)

    await loginAction(makeFormData(CREDENTIALS))

    expect(LoginOtp.deleteLoginOtp).not.toHaveBeenCalled()
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/login/verify-otp')
  })

  // Enumeration safety: a visitor must not be able to tell a dispatch failure
  // apart from a bad password. Both are dead ends with no extra information.
  it('uses a message that says nothing about which control failed', async () => {
    vi.mocked(Email.sendLoginOtpEmail).mockRejectedValue(
      new Error('Resend: API key is invalid (401)')
    )

    const result = await loginAction(makeFormData(CREDENTIALS))

    expect(result.formError).toBe(EXPECTED_MESSAGE)
    expect(result.formError).not.toMatch(/resend|api key|401|provider|smtp/i)
  })
})
