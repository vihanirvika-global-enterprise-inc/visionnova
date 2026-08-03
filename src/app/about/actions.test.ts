import { vi, describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit } from '@/lib/rateLimit'
import { logEmail } from '@/lib/emailLog'

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))

vi.mock('resend', () => ({
  Resend: vi.fn(function (this: any) {
    this.emails = { send: mockSend }
  }),
}))

vi.mock('@/lib/getClientIp', () => ({
  getClientIp: vi.fn().mockReturnValue('203.0.113.5'),
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('@/lib/emailLog', () => ({
  logEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/sentry', () => ({
  captureSpamAttempt: vi.fn(),
}))

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  const values = {
    name: 'Jane Doe', email: 'jane@example.com',
    subject: 'Order enquiry', message: 'Hello, I have a question about my order.',
    ...overrides,
  }
  for (const [key, value] of Object.entries(values)) fd.set(key, value)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true })
  mockSend.mockResolvedValue({ id: 'email-001' })
})

describe('sendContactEmail', () => {
  it('sends email with correct to address and subject line', async () => {
    const { sendContactEmail } = await import('./actions')
    const result = await sendContactEmail(makeFormData())

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@visionnova.com',
        subject: '[VisionNova Contact] Order enquiry — Jane Doe',
        replyTo: 'jane@example.com',
      })
    )
    expect(result).toEqual({ success: true })
  })

  it('returns { error } when Resend throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network error'))

    const { sendContactEmail } = await import('./actions')
    const result = await sendContactEmail(makeFormData())

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error.length).toBeGreaterThan(0)
  })
})

describe('sendContactEmail — rate limiting', () => {
  it('checks the shared IP+endpoint limiter before sending', async () => {
    const { sendContactEmail } = await import('./actions')
    await sendContactEmail(makeFormData())

    expect(checkRateLimit).toHaveBeenCalledWith('203.0.113.5', 'contact')
  })

  it('rejects with the retry-after information, same shape as login/register, without sending', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 37 })

    const { sendContactEmail } = await import('./actions')
    const result = await sendContactEmail(makeFormData())

    expect(result).toEqual({ error: expect.stringContaining('37') })
    expect(mockSend).not.toHaveBeenCalled()
  })
})

describe('sendContactEmail — persistence', () => {
  it('logs a successful send to email_log', async () => {
    const { sendContactEmail } = await import('./actions')
    await sendContactEmail(makeFormData({ name: 'Ada' }))

    expect(logEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@visionnova.com',
        template: 'contact-form',
        status: 'sent',
        payload: expect.objectContaining({ name: 'Ada' }),
      })
    )
  })

  // The previous version had no persistence at all, so a failed dispatch
  // vanished with no trail either way — the point of this table is that
  // failure gets recorded, not swallowed.
  it('logs a failed send to email_log with status=failed, not silently', async () => {
    mockSend.mockRejectedValueOnce(new Error('Resend API timeout'))

    const { sendContactEmail } = await import('./actions')
    await sendContactEmail(makeFormData())

    expect(logEmail).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: expect.stringContaining('Resend API timeout') })
    )
  })

  it('does not log anything for a rate-limited submission', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 10 })

    const { sendContactEmail } = await import('./actions')
    await sendContactEmail(makeFormData())

    expect(logEmail).not.toHaveBeenCalled()
  })
})

describe('sendContactEmail — honeypot', () => {
  // A real user never sees or fills this field. Any value means a bot filled
  // every input indiscriminately.
  it('drops a submission with a filled honeypot field silently, without sending', async () => {
    const { sendContactEmail } = await import('./actions')
    const result = await sendContactEmail(makeFormData({ company: 'anything' }))

    expect(mockSend).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it('does not write an email_log row for a honeypot-caught submission', async () => {
    const { sendContactEmail } = await import('./actions')
    await sendContactEmail(makeFormData({ company: 'anything' }))

    expect(logEmail).not.toHaveBeenCalled()
  })

  it('does not check the rate limit for a honeypot-caught submission', async () => {
    const { sendContactEmail } = await import('./actions')
    await sendContactEmail(makeFormData({ company: 'anything' }))

    expect(checkRateLimit).not.toHaveBeenCalled()
  })

  it('sends normally when the honeypot field is empty', async () => {
    const { sendContactEmail } = await import('./actions')
    const result = await sendContactEmail(makeFormData({ company: '' }))

    expect(mockSend).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })
})
