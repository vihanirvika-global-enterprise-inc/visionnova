import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./sentry', () => ({ captureOrderError: vi.fn() }))

import { captureOrderError } from './sentry'
import { sendEmailBestEffort } from './bestEffortEmail'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sendEmailBestEffort', () => {
  it('awaits the send on the happy path', async () => {
    const send = vi.fn().mockResolvedValue({ id: 'msg-1' })

    await sendEmailBestEffort(send, { orderId: 'order-1' })

    expect(send).toHaveBeenCalled()
    expect(captureOrderError).not.toHaveBeenCalled()
  })

  // The caller has already committed order state by this point, so a mail
  // failure must never propagate — it would be reported as if the whole
  // operation failed.
  it('swallows a rejection and reports it instead', async () => {
    const failure = new Error('Missing API key')
    const send = vi.fn().mockRejectedValue(failure)

    await expect(sendEmailBestEffort(send, { orderId: 'order-1' })).resolves.toBeUndefined()

    expect(captureOrderError).toHaveBeenCalledWith(failure, { orderId: 'order-1' })
  })

  it('wraps a non-Error rejection so Sentry always receives an Error', async () => {
    const send = vi.fn().mockRejectedValue('string failure')

    await sendEmailBestEffort(send, { orderId: 'order-1' })

    expect(captureOrderError).toHaveBeenCalledWith(
      expect.any(Error),
      { orderId: 'order-1' }
    )
  })

  it('swallows a synchronous throw as well', async () => {
    const send = vi.fn(() => {
      throw new Error('constructed badly')
    })

    await expect(sendEmailBestEffort(send, { orderId: 'order-1' })).resolves.toBeUndefined()

    expect(captureOrderError).toHaveBeenCalled()
  })
})
