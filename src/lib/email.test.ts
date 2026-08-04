import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))

vi.mock('resend', () => ({
  Resend: vi.fn(function (this: any) {
    this.emails = { send: mockSend }
  }),
}))

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
