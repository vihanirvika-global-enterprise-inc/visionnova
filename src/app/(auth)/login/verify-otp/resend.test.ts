import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/pendingLogin', () => ({ getPendingLogin: vi.fn(), clearPendingLogin: vi.fn() }))
vi.mock('@/lib/loginOtp', () => ({ createLoginOtp: vi.fn(), deleteLoginOtp: vi.fn() }))
vi.mock('@/lib/customers', () => ({ getCustomerById: vi.fn() }))
vi.mock('@/lib/email', () => ({ sendLoginOtpEmail: vi.fn() }))
vi.mock('@/lib/getClientIp', () => ({ getClientIp: vi.fn(() => '1.2.3.4') }))
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
}))

import { getPendingLogin } from '@/lib/pendingLogin'
import { createLoginOtp } from '@/lib/loginOtp'
import { getCustomerById } from '@/lib/customers'
import { sendLoginOtpEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rateLimit'
import { resendOtpAction } from './actions'

const CUSTOMER_ID = 'a58630d6-35ef-4135-8f79-c39c2e99fa4b'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getPendingLogin).mockReturnValue({ customerId: CUSTOMER_ID, role: 'customer' })
  vi.mocked(getCustomerById).mockResolvedValue({
    id: CUSTOMER_ID, email: 'asha@example.com', firstName: 'Asha',
  } as never)
  vi.mocked(createLoginOtp).mockResolvedValue({ code: '123456', id: 'otp-1' })
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as never)
  vi.mocked(sendLoginOtpEmail).mockResolvedValue(undefined as never)
})

describe('resendOtpAction', () => {
  it('issues a new code and emails it', async () => {
    const result = await resendOtpAction()

    expect(createLoginOtp).toHaveBeenCalledWith(CUSTOMER_ID)
    expect(sendLoginOtpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'asha@example.com', code: '123456' })
    )
    expect(result).toEqual({ sent: true })
  })

  // Without a pending login there is nobody to send to, and the customerId
  // would come from nowhere. Same guard verifyOtpAction already applies.
  it('redirects to /login when there is no pending login', async () => {
    vi.mocked(getPendingLogin).mockReturnValue(null)

    await expect(resendOtpAction()).rejects.toThrow('NEXT_REDIRECT')
    expect(createLoginOtp).not.toHaveBeenCalled()
  })

  // Resend is an unauthenticated send of an email to an address we hold —
  // exactly the shape someone would abuse to mail-bomb a customer.
  it('is rate limited, and issues no code when the limit is hit', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 45 } as never)

    const result = await resendOtpAction()

    expect(createLoginOtp).not.toHaveBeenCalled()
    expect(sendLoginOtpEmail).not.toHaveBeenCalled()
    expect(result).toMatchObject({ sent: false })
  })

  it('rate limits on its own endpoint, not the shared login bucket', async () => {
    await resendOtpAction()

    expect(checkRateLimit).toHaveBeenCalledWith('1.2.3.4', 'otp-resend')
  })

  // A stale cookie whose customer no longer exists must not 500 the page.
  it('fails closed when the pending customer no longer exists', async () => {
    vi.mocked(getCustomerById).mockResolvedValue(null as never)

    const result = await resendOtpAction()

    expect(sendLoginOtpEmail).not.toHaveBeenCalled()
    expect(result).toMatchObject({ sent: false })
  })

  // Delivery failing is not a reason to leak that the address bounced, and
  // not a reason to 500 either — the code is already stored.
  it('does not throw when the provider rejects the send', async () => {
    vi.mocked(sendLoginOtpEmail).mockRejectedValue(new Error('provider down'))

    await expect(resendOtpAction()).resolves.toMatchObject({ sent: false })
  })
})
