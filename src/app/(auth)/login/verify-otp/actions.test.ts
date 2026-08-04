import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as LoginOtp from '@/lib/loginOtp'
import { getSession } from '@/lib/session'
import { createPendingLogin } from '@/lib/pendingLogin'
import { checkRateLimit } from '@/lib/rateLimit'
import { verifyOtpAction } from './actions'

vi.mock('@/lib/loginOtp', () => ({
  verifyLoginOtp: vi.fn(),
}))

vi.mock('@/lib/getClientIp', () => ({
  getClientIp: vi.fn().mockReturnValue('203.0.113.5'),
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
}))

let mockSet: ReturnType<typeof vi.fn>
let mockGet: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

function setPendingLoginCookie(customerId: string, role: string) {
  // Round-trips through the real createPendingLogin so the signature is
  // genuinely valid, not just a shaped object.
  createPendingLogin(customerId, role)
  const [, token] = mockSet.mock.calls[mockSet.mock.calls.length - 1]
  mockGet.mockReturnValue({ value: token })
}

function makeFormData(code: string): FormData {
  const fd = new FormData()
  fd.set('code', code)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSet = vi.fn()
  mockGet = vi.fn()
  mockDelete = vi.fn()
  vi.spyOn(NextHeaders, 'cookies').mockReturnValue(
    { set: mockSet, get: mockGet, delete: mockDelete } as any
  )
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('verifyOtpAction', () => {
  it('redirects to /login when there is no pending login', async () => {
    mockGet.mockReturnValue(undefined)

    await expect(verifyOtpAction(makeFormData('123456'))).rejects.toThrow('NEXT_REDIRECT')
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/login')
    expect(LoginOtp.verifyLoginOtp).not.toHaveBeenCalled()
  })

  it('checks the rate limit under the "verify-otp" key', async () => {
    setPendingLoginCookie('cust-1', 'customer')

    await verifyOtpAction(makeFormData('123456'))

    expect(checkRateLimit).toHaveBeenCalledWith('203.0.113.5', 'verify-otp')
  })

  it('returns a friendly error and never verifies when rate limited', async () => {
    setPendingLoginCookie('cust-1', 'customer')
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 9 })

    const result = await verifyOtpAction(makeFormData('123456'))

    expect(result).toEqual({ formError: expect.stringContaining('9') })
    expect(LoginOtp.verifyLoginOtp).not.toHaveBeenCalled()
  })

  it('rejects a non-6-digit code without hitting the database', async () => {
    setPendingLoginCookie('cust-1', 'customer')

    const result = await verifyOtpAction(makeFormData('12'))

    expect(result).toEqual({ formError: expect.any(String) })
    expect(LoginOtp.verifyLoginOtp).not.toHaveBeenCalled()
  })

  it('returns an error for an invalid or expired code', async () => {
    setPendingLoginCookie('cust-1', 'customer')
    vi.mocked(LoginOtp.verifyLoginOtp).mockResolvedValue(false)

    const result = await verifyOtpAction(makeFormData('999999'))

    expect(result).toEqual({ formError: expect.any(String) })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('creates a real session, clears the pending login, and redirects to /account on a valid code', async () => {
    setPendingLoginCookie('cust-1', 'optometrist')
    vi.mocked(LoginOtp.verifyLoginOtp).mockResolvedValue(true)

    await expect(verifyOtpAction(makeFormData('123456'))).rejects.toThrow('NEXT_REDIRECT')

    expect(LoginOtp.verifyLoginOtp).toHaveBeenCalledWith('cust-1', '123456')
    expect(mockDelete).toHaveBeenCalledWith('pending_login')
    expect(mockSet).toHaveBeenCalledWith(
      'session', expect.any(String), expect.objectContaining({ httpOnly: true })
    )
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/account')

    // Proves the role carried through from the pending login into the real
    // session, not just that some session was created.
    const sessionCall = mockSet.mock.calls.find((call) => call[0] === 'session')
    mockGet.mockReturnValue({ value: sessionCall![1] })
    expect(getSession()?.role).toBe('optometrist')
  })

  // ST-021/022 (EP-007): a partner clinic must land on their own portal, not
  // the customer account dashboard, which has nothing relevant to them.
  it('redirects a partner_optometrist to /partner-portal instead of /account', async () => {
    setPendingLoginCookie('cust-1', 'partner_optometrist')
    vi.mocked(LoginOtp.verifyLoginOtp).mockResolvedValue(true)

    await expect(verifyOtpAction(makeFormData('123456'))).rejects.toThrow('NEXT_REDIRECT')

    expect(NextNavigation.redirect).toHaveBeenCalledWith('/partner-portal')
    expect(NextNavigation.redirect).not.toHaveBeenCalledWith('/account')
  })
})
