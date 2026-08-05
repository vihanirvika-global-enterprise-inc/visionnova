import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as NextNavigation from 'next/navigation'
import { mockSql } from '@/test/dbMock'

// The unit tests for this flow mock '@/lib/email', which is precisely where
// the bug lived: loginAction looked correct against a mocked sender, and the
// sender looked correct against a mocked action. Nothing exercised the seam
// between them, so a provider error that arrives as a RESOLVED promise passed
// straight through both.
//
// This test therefore mocks only the Resend SDK — the real email module and
// the real loginOtp module run — and asserts on the property that actually
// matters to a user: an undelivered code must not advance them to the
// code-entry step.

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))

vi.mock('resend', () => ({
  Resend: vi.fn(function (this: any) {
    this.emails = { send: mockSend }
  }),
}))

vi.mock('@/lib/auth', () => ({ loginUser: vi.fn() }))
vi.mock('@/lib/db', () => ({ sql: vi.fn() }))
vi.mock('@/lib/getClientIp', () => ({ getClientIp: vi.fn().mockReturnValue('203.0.113.5') }))
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers', () => ({
  cookies: () => ({ set: vi.fn(), get: vi.fn(), delete: vi.fn() }),
}))

const CUSTOMER = {
  id: 'cust-1',
  email: 'user@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  passwordHash: 'hash',
  phone: null,
  role: 'customer' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makeFormData() {
  const fd = new FormData()
  fd.append('email', 'user@example.com')
  fd.append('password', 'Str0ngPassw0rd!')
  return fd
}

async function runLogin() {
  const { loginUser } = await import('@/lib/auth')
  vi.mocked(loginUser).mockResolvedValue(CUSTOMER)

  const { sql } = await import('@/lib/db')
  const spy = mockSql(sql)
  spy.mockResolvedValueOnce([{ id: 'otp-1' }]) // INSERT ... RETURNING id
  spy.mockResolvedValue([]) // any follow-up statement (the cleanup DELETE)

  const { loginAction } = await import('./actions')
  return { result: await loginAction(makeFormData()), spy }
}

describe('login flow — provider rejects the OTP email', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  // The exact shape the Resend SDK returns for a revoked or mistyped key: a
  // resolved promise, not a rejection.
  it('keeps the user on /login instead of advancing to the code-entry step', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'API key is invalid', statusCode: 401 },
    })

    const { result } = await runLogin()

    expect(result).toEqual({
      formError: 'Could not send a verification code. Please try again.',
    })
    expect(NextNavigation.redirect).not.toHaveBeenCalled()
  })

  it('removes the OTP row for the code that was never delivered', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'API key is invalid', statusCode: 401 },
    })

    const { spy } = await runLogin()

    const statements = spy.mock.calls.map((call) => (call[0] as string[]).join('?'))
    expect(statements.some((s) => /DELETE FROM login_otps/i.test(s))).toBe(true)
  })

  it('still advances to the code-entry step when the provider accepts the mail', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const { spy } = await runLogin()

    expect(NextNavigation.redirect).toHaveBeenCalledWith('/login/verify-otp')

    const statements = spy.mock.calls.map((call) => (call[0] as string[]).join('?'))
    expect(statements.some((s) => /DELETE FROM login_otps/i.test(s))).toBe(false)
  })
})
