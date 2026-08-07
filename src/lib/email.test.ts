import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))

vi.mock('resend', () => ({
  Resend: vi.fn(function (this: any) {
    this.emails = { send: mockSend }
  }),
}))

// The Resend SDK reports a 4xx/5xx by RESOLVING with { data: null, error },
// not by throwing — so `await send()` succeeding says nothing about whether
// the mail went out. sendLoginOtpEmail is the one sender where that
// distinction is load-bearing: loginAction treats a send failure as fatal and
// must not advance to the code-entry step, and it can only do that if this
// function surfaces the returned-error channel as a throw.
describe('sendLoginOtpEmail — returned-error channel', () => {
  beforeEach(() => {
    mockSend.mockReset()
    // These cover the configured-key path. Without this the suite runs with
    // NODE_ENV=test and no key, which is the dev console fallback — a
    // different code path that never reaches Resend at all.
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ['401 invalid key', { name: 'validation_error', message: 'API key is invalid', statusCode: 401 }],
    ['429 quota exhausted', { name: 'rate_limit_exceeded', message: 'Too many requests', statusCode: 429 }],
    ['500 provider outage', { name: 'application_error', message: 'Internal server error', statusCode: 500 }],
  ])('throws when Resend resolves with an error object (%s)', async (_label, error) => {
    mockSend.mockResolvedValue({ data: null, error })

    const { sendLoginOtpEmail } = await import('./email')

    await expect(
      sendLoginOtpEmail({ to: 'customer@example.com', firstName: 'Priya', code: '482913' })
    ).rejects.toThrow()
  })

  it('does not put the provider message in the thrown error', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'API key is invalid', statusCode: 401 },
    })

    const { sendLoginOtpEmail } = await import('./email')

    // The action turns this into user-facing copy. Provider wording leaking
    // that far would tell a visitor which control failed and why. Asserted as
    // the absence of the provider's text rather than the presence of any
    // particular wording of ours — the message moved to sendEmail when the
    // check was generalised, and the property that matters did not.
    await expect(
      sendLoginOtpEmail({ to: 'customer@example.com', firstName: 'Priya', code: '482913' })
    ).rejects.toThrow(expect.not.stringMatching(/api key|401|resend|invalid/i))
  })

  it('resolves normally when Resend reports success', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-otp-1' }, error: null })

    const { sendLoginOtpEmail } = await import('./email')

    await expect(
      sendLoginOtpEmail({ to: 'customer@example.com', firstName: 'Priya', code: '482913' })
    ).resolves.toBeDefined()
  })
})

describe('sendEmail', () => {
  beforeEach(() => {
    mockSend.mockReset()
  })

  it('calls resend.emails.send with from, to, subject, react and returns the result', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null })

    const { sendEmail } = await import('./email')

    const result = await sendEmail({
      to: 'customer@example.com',
      subject: 'Your VisionNova order',
      react: { type: 'div', props: { children: 'Hello' }, key: null } as any,
    })

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith({
      from: 'VisionNova <noreply@visionnova.com>',
      to: 'customer@example.com',
      subject: 'Your VisionNova order',
      react: expect.anything(),
    })
    expect(result).toEqual({ data: { id: 'email-123' }, error: null })
  })
})

describe('sendOrderShippedEmail', () => {
  beforeEach(() => {
    mockSend.mockReset()
  })

  it('sends shipped email with order ID in subject', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-ship-1' }, error: null })
    const { sendOrderShippedEmail } = await import('./email')

    await sendOrderShippedEmail({
      to: 'customer@example.com',
      firstName: 'Sam',
      orderId: 'order-007',
    })

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'VisionNova <noreply@visionnova.com>',
        to: 'customer@example.com',
        subject: expect.stringContaining('order-007'),
        react: expect.anything(),
      })
    )
  })
})

describe('sendPrescriptionStatusEmail', () => {
  beforeEach(() => {
    mockSend.mockReset()
  })

  it('sends approved email with correct subject when status is approved', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-rx-1' }, error: null })
    const { sendPrescriptionStatusEmail } = await import('./email')

    await sendPrescriptionStatusEmail({
      to: 'patient@example.com',
      firstName: 'Alex',
      status: 'approved',
    })

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'VisionNova <noreply@visionnova.com>',
        to: 'patient@example.com',
        subject: expect.stringMatching(/approved/i),
        react: expect.anything(),
      })
    )
  })

  it('sends rejected email with correct subject when status is rejected', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-rx-2' }, error: null })
    const { sendPrescriptionStatusEmail } = await import('./email')

    await sendPrescriptionStatusEmail({
      to: 'patient@example.com',
      firstName: 'Alex',
      status: 'rejected',
    })

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/rejected/i),
        react: expect.anything(),
      })
    )
  })
})

describe('sendLoginOtpEmail', () => {
  beforeEach(() => {
    mockSend.mockReset()
    // Asserts the real send; see the note on the returned-error block above.
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sends the OTP code to the customer with a verification-code subject', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-otp-1' }, error: null })
    const { sendLoginOtpEmail } = await import('./email')

    await sendLoginOtpEmail({
      to: 'customer@example.com',
      firstName: 'Priya',
      code: '482913',
    })

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'VisionNova <noreply@visionnova.com>',
        to: 'customer@example.com',
        subject: expect.stringMatching(/verification code/i),
        react: expect.anything(),
      })
    )
  })
})

describe('sendOrderConfirmationEmail', () => {
  beforeEach(() => {
    mockSend.mockReset()
  })

  it('sends to customer with order ID in subject and order details in react element', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-789' }, error: null })

    const { sendOrderConfirmationEmail } = await import('./email')

    await sendOrderConfirmationEmail({
      to: 'jane@example.com',
      orderId: 'order-001',
      firstName: 'Jane',
      totalAmount: 149.99,
    })

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'VisionNova <noreply@visionnova.com>',
        to: 'jane@example.com',
        subject: expect.stringContaining('order-001'),
        react: expect.anything(),
      })
    )
  })
})

// The returned-error channel belongs at the shared send, not in each sender.
// Resend reports a 4xx/5xx by RESOLVING with { data: null, error }, so every
// caller that merely awaits sendEmail — which is all of them, via
// sendEmailBestEffort — reads a failed delivery as a success.
describe('sendEmail — returned-error channel', () => {
  beforeEach(() => {
    mockSend.mockReset()
  })

  it.each([
    ['401 revoked or mistyped key', 401],
    ['429 quota exhausted', 429],
    ['500 provider outage', 500],
  ])('throws rather than resolving when Resend returns an error (%s)', async (_label, statusCode) => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'application_error', message: 'nope', statusCode },
    })

    const { sendEmail } = await import('./email')

    await expect(
      sendEmail({ to: 'c@example.com', subject: 'x', react: { type: 'div', props: {}, key: null } as any })
    ).rejects.toThrow()
  })

  it('still resolves with the result when Resend accepts the mail', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const { sendEmail } = await import('./email')

    const result = await sendEmail({
      to: 'c@example.com',
      subject: 'x',
      react: { type: 'div', props: {}, key: null } as any,
    })

    expect(result.data).toEqual({ id: 'email-1' })
  })

  // Every transactional sender goes through sendEmail, so one check covers
  // order confirmation, shipping and both prescription notifications.
  it.each([
    ['sendOrderConfirmationEmail', { to: 'c@example.com', orderId: 'o-1', firstName: 'Ada', totalAmount: 100 }],
    ['sendOrderShippedEmail', { to: 'c@example.com', firstName: 'Ada', orderId: 'o-1' }],
    ['sendPrescriptionStatusEmail', { to: 'c@example.com', firstName: 'Ada', status: 'approved' as const }],
  ])('%s surfaces the returned-error channel as a throw', async (fnName, options) => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'API key is invalid', statusCode: 401 },
    })

    const mod = await import('./email')
    const send = (mod as Record<string, any>)[fnName]

    await expect(send(options)).rejects.toThrow()
  })
})

// ── Dev-only OTP console fallback ────────────────────────────────────────────

// Without RESEND_API_KEY the Resend constructor throws, so no OTP is delivered
// and nobody can complete a login locally at all. This prints the code to the
// server console instead — strictly when NOT in production AND no key is
// configured. It changes delivery only: generation and the verify-otp check
// are untouched, so the developer still types the real code into the real
// screen.
describe('sendLoginOtpEmail — dev-only console fallback', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockSend.mockReset()
    // The one-time warning is module-level state, so each test needs a fresh
    // module instance or only the first would ever see it.
    vi.resetModules()
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    infoSpy.mockRestore()
    warnSpy.mockRestore()
  })

  function loggedLines(spy: ReturnType<typeof vi.spyOn>): string {
    return spy.mock.calls.map((args: unknown[]) => args.join(' ')).join('\n')
  }

  it.each(['development', 'test'])(
    'logs the code instead of throwing when NODE_ENV=%s and no key is set',
    async (nodeEnv) => {
      vi.stubEnv('NODE_ENV', nodeEnv as 'development' | 'test')
      vi.stubEnv('RESEND_API_KEY', '')
      const { sendLoginOtpEmail } = await import('./email')

      await expect(
        sendLoginOtpEmail({ to: 'dev@example.com', firstName: 'Dev', code: '482913' })
      ).resolves.not.toThrow()

      expect(loggedLines(infoSpy)).toContain('[dev-otp]')
      // Delivery was replaced, not duplicated.
      expect(mockSend).not.toHaveBeenCalled()
    }
  )

  it('logs the recipient and the six-digit code so it can be typed in', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('RESEND_API_KEY', '')
    const { sendLoginOtpEmail } = await import('./email')

    await sendLoginOtpEmail({ to: 'dev@example.com', firstName: 'Dev', code: '482913' })

    const logged = loggedLines(infoSpy)
    expect(logged).toContain('dev@example.com')
    expect(logged).toMatch(/\b482913\b/)
  })

  // Silent degradation is the failure mode worth guarding against: a fallback
  // nobody notices is one that ships.
  it('warns once per process, not once per login', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('RESEND_API_KEY', '')
    const { sendLoginOtpEmail } = await import('./email')

    await sendLoginOtpEmail({ to: 'a@example.com', firstName: 'A', code: '111111' })
    await sendLoginOtpEmail({ to: 'b@example.com', firstName: 'B', code: '222222' })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    // Both codes still printed — only the banner is throttled.
    expect(loggedLines(infoSpy)).toMatch(/111111[\s\S]*222222/)
  })

  it('uses the real sender and logs no code once a key is configured', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('RESEND_API_KEY', 're_a_real_looking_key')
    mockSend.mockResolvedValue({ data: { id: 'email-otp-1' }, error: null })
    const { sendLoginOtpEmail } = await import('./email')

    await sendLoginOtpEmail({ to: 'customer@example.com', firstName: 'Priya', code: '482913' })

    expect(mockSend).toHaveBeenCalledOnce()
    expect(loggedLines(infoSpy)).not.toContain('[dev-otp]')
    expect(loggedLines(warnSpy)).not.toContain('[dev-otp]')
  })

  // The whole point of the NODE_ENV half of the guard. A production deploy
  // that lost its key must fail loudly, not start printing OTPs to a log
  // aggregator that a great many people can read.
  it('still throws in production when no key is set', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RESEND_API_KEY', '')
    const { sendLoginOtpEmail } = await import('./email')

    await expect(
      sendLoginOtpEmail({ to: 'customer@example.com', firstName: 'Priya', code: '482913' })
    ).rejects.toThrow()

    expect(loggedLines(infoSpy)).not.toContain('[dev-otp]')
  })

  it('never prints a code in production even when a key is present', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RESEND_API_KEY', 're_a_real_looking_key')
    mockSend.mockResolvedValue({ data: { id: 'email-otp-1' }, error: null })
    const { sendLoginOtpEmail } = await import('./email')

    await sendLoginOtpEmail({ to: 'customer@example.com', firstName: 'Priya', code: '482913' })

    expect(loggedLines(infoSpy)).not.toContain('[dev-otp]')
    expect(mockSend).toHaveBeenCalledOnce()
  })
})
