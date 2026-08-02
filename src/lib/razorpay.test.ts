import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getServerRazorpay, _resetRazorpayInstance } from './razorpay'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  _resetRazorpayInstance()
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
  process.env.RAZORPAY_KEY_SECRET = 'test_secret'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.restoreAllMocks()
})

describe('getServerRazorpay', () => {
  it('throws a helpful error when RAZORPAY_KEY_ID is missing', () => {
    delete process.env.RAZORPAY_KEY_ID
    expect(() => getServerRazorpay()).toThrow(/RAZORPAY_KEY_ID/)
  })

  it('throws a helpful error when RAZORPAY_KEY_SECRET is missing', () => {
    delete process.env.RAZORPAY_KEY_SECRET
    expect(() => getServerRazorpay()).toThrow(/RAZORPAY_KEY_SECRET/)
  })

  it('reuses one lazily-created instance', () => {
    expect(getServerRazorpay()).toBe(getServerRazorpay())
  })

  it('creates a new instance after reset', () => {
    const first = getServerRazorpay()
    _resetRazorpayInstance()
    expect(getServerRazorpay()).not.toBe(first)
  })
})

describe('RazorpayClient.createOrder', () => {
  it('posts integer paise, currency and notes with basic auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'order_razorpay_1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const order = await getServerRazorpay().createOrder({
      amount: 99900,
      currency: 'INR',
      notes: { orderId: 'order-1' },
    })

    expect(order).toEqual({ id: 'order_razorpay_1' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.razorpay.com/v1/orders')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from('rzp_test_key:test_secret').toString('base64')}`
    )
    expect(JSON.parse(init.body)).toEqual({
      amount: 99900,
      currency: 'INR',
      notes: { orderId: 'order-1' },
    })
  })

  it('throws with the API error description when Razorpay rejects the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { description: 'amount must be an integer' } }),
      })
    )

    await expect(
      getServerRazorpay().createOrder({
        amount: 1,
        currency: 'INR',
        notes: { orderId: 'order-1' },
      })
    ).rejects.toThrow(/amount must be an integer/)
  })
})

describe('RazorpayClient.fetchPayment', () => {
  it('gets a payment by id with basic auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'pay_123',
        order_id: 'order_razorpay_1',
        amount: 99900,
        currency: 'INR',
        status: 'captured',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const payment = await getServerRazorpay().fetchPayment('pay_123')

    expect(payment).toEqual({
      id: 'pay_123',
      order_id: 'order_razorpay_1',
      amount: 99900,
      currency: 'INR',
      status: 'captured',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.razorpay.com/v1/payments/pay_123')
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from('rzp_test_key:test_secret').toString('base64')}`
    )
  })

  it('throws with the API error description when Razorpay rejects the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: { description: 'The id provided does not exist' } }),
      })
    )

    await expect(getServerRazorpay().fetchPayment('pay_bad')).rejects.toThrow(
      /does not exist/
    )
  })
})
