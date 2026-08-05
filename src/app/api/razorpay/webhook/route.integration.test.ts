import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'

// The unit tests either mock '@/lib/email' or mock sendEmailBestEffort, so
// nothing exercised the seam between them — which is where a provider error
// that arrives as a RESOLVED promise used to be read as a delivered email.
// Here the real bestEffortEmail and the real email module run; only the SDK
// and the data layer are stubbed.

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))

vi.mock('resend', () => ({
  Resend: vi.fn(function (this: any) {
    this.emails = { send: mockSend }
  }),
}))

vi.mock('@/lib/sentry', () => ({
  captureOrderError: vi.fn(),
  capturePaymentError: vi.fn(),
}))

vi.mock('@/lib/orders', () => ({ updateOrderStatus: vi.fn() }))
vi.mock('@/lib/customers', () => ({ getCustomerById: vi.fn() }))

const SECRET = 'test-webhook-secret'
const ORDER_ID = 'order-42'

function signedRequest() {
  const body = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_1', notes: { orderId: ORDER_ID } } } },
  })
  const signature = createHmac('sha256', SECRET).update(body).digest('hex')
  return new Request('http://localhost/api/razorpay/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-razorpay-signature': signature },
    body,
  })
}

async function postWebhook() {
  const { updateOrderStatus } = await import('@/lib/orders')
  vi.mocked(updateOrderStatus).mockResolvedValue({
    id: ORDER_ID,
    customerId: 'cust-1',
    status: 'paid',
    totalAmount: 2499,
  } as any)

  const { getCustomerById } = await import('@/lib/customers')
  vi.mocked(getCustomerById).mockResolvedValue({
    id: 'cust-1',
    email: 'customer@example.com',
    firstName: 'Ada',
  } as any)

  const { POST } = await import('./route')
  return POST(signedRequest() as never)
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('razorpay webhook — provider rejects the confirmation email', () => {
  it('still commits the order and still returns 200 to the gateway', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'API key is invalid', statusCode: 401 },
    })

    const response = await postWebhook()

    // A non-2xx here makes Razorpay retry a payment that already succeeded.
    expect(response.status).toBe(200)

    const { updateOrderStatus } = await import('@/lib/orders')
    expect(updateOrderStatus).toHaveBeenCalledWith(ORDER_ID, 'paid')
  })

  it('reports the failed send instead of swallowing it', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'API key is invalid', statusCode: 401 },
    })

    await postWebhook()

    const { captureOrderError } = await import('@/lib/sentry')
    expect(captureOrderError).toHaveBeenCalledWith(expect.any(Error), { orderId: ORDER_ID })
  })

  it('reports nothing when the provider accepts the mail', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const response = await postWebhook()

    expect(response.status).toBe(200)

    const { captureOrderError } = await import('@/lib/sentry')
    expect(captureOrderError).not.toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledOnce()
  })
})
