import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/payments/select-provider', () => ({ selectProvider: vi.fn() }))

import { selectProvider } from '@/lib/payments/select-provider'
import type { PaymentProvider } from '@/lib/payments/provider'
import { createPayment } from './payment-actions'

const ORIGINAL_ENV = { ...process.env }
let mockCreateIntent: ReturnType<typeof vi.fn>

function mockProvider(name: 'stripe' | 'razorpay') {
  mockCreateIntent = vi.fn().mockResolvedValue({ clientRef: 'ref_123' })
  vi.mocked(selectProvider).mockReturnValue({
    name,
    createIntent: mockCreateIntent,
    verifyWebhook: vi.fn(),
    parseEvent: vi.fn(),
  } as unknown as PaymentProvider)
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('createPayment', () => {
  it('routes an Indian address to Razorpay and charges INR', async () => {
    mockProvider('razorpay')

    const result = await createPayment(99900, 'order-1', 'IN')

    expect(selectProvider).toHaveBeenCalledWith('IN')
    expect(mockCreateIntent).toHaveBeenCalledWith(99900, 'order-1', 'INR')
    expect(result).toEqual({
      provider: 'razorpay',
      clientRef: 'ref_123',
      keyId: 'rzp_test_key',
    })
  })

  // GLOBAL is not launched: prices are INR numbers with no FX layer, so a USD
  // charge would bill the rupee figure in dollars (~83x). Fail closed before any
  // payment exists at the gateway.
  it.each(['US', 'GB', 'AE', 'SG'])('refuses %s before creating any payment', async (country) => {
    mockProvider('stripe')

    const result = await createPayment(99900, 'order-1', country)

    expect(result.error).toMatch(/india/i)
    expect(selectProvider).not.toHaveBeenCalled()
    expect(mockCreateIntent).not.toHaveBeenCalled()
  })

  it('refuses a lowercase non-IN country too', async () => {
    mockProvider('stripe')

    const result = await createPayment(99900, 'order-1', 'us')

    expect(result.error).toMatch(/india/i)
    expect(mockCreateIntent).not.toHaveBeenCalled()
  })

  it('refuses an unrecognised country rather than defaulting to a gateway', async () => {
    mockProvider('stripe')

    const result = await createPayment(99900, 'order-1', 'ZZ')

    expect(result.error).toMatch(/india/i)
    expect(mockCreateIntent).not.toHaveBeenCalled()
  })

  it('keeps the amount as integer paise', async () => {
    mockProvider('razorpay')

    await createPayment(99999, 'order-1', 'IN')

    const [amount] = mockCreateIntent.mock.calls[0]
    expect(amount).toBe(99999)
    expect(Number.isInteger(amount)).toBe(true)
  })

  it('passes a provider failure back to the caller', async () => {
    mockProvider('razorpay')
    mockCreateIntent.mockResolvedValue({ error: 'Payment declined' })

    expect(await createPayment(99900, 'order-1', 'IN')).toEqual({ error: 'Payment declined' })
  })
})
