import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))

vi.mock('resend', () => ({
  Resend: vi.fn(function (this: any) {
    this.emails = { send: mockSend }
  }),
}))

describe('sendContactEmail', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sends email with correct to address and subject line', async () => {
    mockSend.mockResolvedValueOnce({ id: 'email-001' })

    const { sendContactEmail } = await import('./actions')
    const fd = new FormData()
    fd.set('name', 'Jane Doe')
    fd.set('email', 'jane@example.com')
    fd.set('subject', 'Order enquiry')
    fd.set('message', 'Hello, I have a question about my order.')

    const result = await sendContactEmail(fd)

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
    const fd = new FormData()
    fd.set('name', 'Jane Doe')
    fd.set('email', 'jane@example.com')
    fd.set('subject', 'Order enquiry')
    fd.set('message', 'Hello.')

    const result = await sendContactEmail(fd)

    expect(result).toEqual({ error: expect.any(String) })
    expect((result as { error: string }).error.length).toBeGreaterThan(0)
  })
})
