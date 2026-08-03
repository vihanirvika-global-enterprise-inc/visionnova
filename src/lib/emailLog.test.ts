import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('logEmail', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('records a successful send', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql).mockResolvedValueOnce([])

    const { logEmail } = await import('./emailLog')
    await logEmail({
      to: 'support@visionnova.com',
      template: 'contact-form',
      payload: { name: 'Ada', message: 'Hi' },
      status: 'sent',
    })

    expect(sql).toHaveBeenCalledOnce()
    const params = spy.mock.calls[0].slice(1)
    expect(params).toContain('support@visionnova.com')
    expect(params).toContain('contact-form')
    expect(params).toContain('sent')
  })

  // A failed send is not silently swallowed — it still leaves a row, with the
  // error captured, so a submission's outcome is never invisible either way.
  it('records a failed send with the error message', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql).mockResolvedValueOnce([])

    const { logEmail } = await import('./emailLog')
    await logEmail({
      to: 'support@visionnova.com',
      template: 'contact-form',
      payload: { name: 'Ada' },
      status: 'failed',
      error: 'Resend API timeout',
    })

    const params = spy.mock.calls[0].slice(1)
    expect(params).toContain('failed')
    expect(params).toContain('Resend API timeout')
  })

  it('serializes the payload as JSON', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql).mockResolvedValueOnce([])

    const { logEmail } = await import('./emailLog')
    await logEmail({
      to: 'support@visionnova.com',
      template: 'contact-form',
      payload: { name: 'Ada', subject: 'Order enquiry' },
      status: 'sent',
    })

    const params = spy.mock.calls[0].slice(1)
    expect(params).toContain(JSON.stringify({ name: 'Ada', subject: 'Order enquiry' }))
  })
})
