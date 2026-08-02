import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('stripe')
vi.mock('@/lib/stripe', () => ({
  getServerStripe: vi.fn(),
}))
vi.mock('@/lib/razorpay', () => ({
  getServerRazorpay: vi.fn(),
}))
vi.mock('@/lib/formatters', () => ({
  formatPrice: vi.fn(),
}))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/orders', () => ({ getOrderById: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

import { getServerStripe } from '@/lib/stripe'
import { getServerRazorpay } from '@/lib/razorpay'
import { formatPrice } from '@/lib/formatters'
import { getSession } from '@/lib/session'
import { getOrderById } from '@/lib/orders'
import ConfirmationPage from './page'

const OWNER = 'cust-owner'
const ORDER_ID = 'order-1'

const mockRetrieve = vi.fn()
const mockFetchPayment = vi.fn()

function givenOrder(overrides: Record<string, unknown> = {}) {
  vi.mocked(getOrderById).mockResolvedValue({
    id: ORDER_ID,
    customerId: OWNER,
    status: 'paid',
    totalAmount: 999,
    shippingAddress: {
      line1: '123 MG Road', city: 'Bengaluru', state: 'KA', postalCode: '560001', country: 'IN',
    },
    carrier: null,
    trackingNumber: null,
    shippedAt: null,
    deliveredAt: null,
    createdAt: new Date('2026-07-01T10:00:00Z'),
    updatedAt: new Date('2026-07-01T10:00:00Z'),
    ...overrides,
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerStripe).mockReturnValue({
    paymentIntents: { retrieve: mockRetrieve },
  } as any)
  vi.mocked(getServerRazorpay).mockReturnValue({
    createOrder: vi.fn(),
    fetchPayment: mockFetchPayment,
  } as any)
  // Default formatPrice — overridden in Test 5
  vi.mocked(formatPrice).mockReturnValue('₹999')
  // Default: the logged-in customer owns the order — individual ownership
  // tests override this to exercise the gate.
  vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
  givenOrder()
})

describe('ConfirmationPage', () => {
  it('shows success UI when redirect_status=succeeded', async () => {
    mockRetrieve.mockResolvedValue({
      status: 'succeeded',
      amount: 99900,
      currency: 'inr',
      metadata: { source: 'visionnova_mvp', orderId: ORDER_ID },
    })

    render(await ConfirmationPage({
      searchParams: {
        payment_intent: 'pi_test_123',
        payment_intent_client_secret: 'pi_test_123_secret_abc',
        redirect_status: 'succeeded',
      },
    }))

    expect(
      screen.getByRole('heading', { name: /payment successful|order confirmed/i })
    ).toBeInTheDocument()
    expect(screen.getByTestId('success-icon')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /track your order/i })).toBeInTheDocument()
    expect(screen.queryByTestId('error-icon')).not.toBeInTheDocument()
  })

  it('shows failure UI when redirect_status=failed', async () => {
    mockRetrieve.mockResolvedValue({
      status: 'requires_payment_method',
      metadata: { orderId: ORDER_ID },
    })

    render(await ConfirmationPage({
      searchParams: {
        payment_intent: 'pi_test_456',
        redirect_status: 'failed',
      },
    }))

    expect(
      screen.getByRole('heading', { name: /payment failed/i })
    ).toBeInTheDocument()
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /return to checkout/i })
    ).toBeInTheDocument()
    expect(screen.queryByTestId('success-icon')).not.toBeInTheDocument()
  })

  it('shows processing UI when redirect_status=processing', async () => {
    mockRetrieve.mockResolvedValue({
      status: 'processing',
      metadata: { orderId: ORDER_ID },
    })

    render(await ConfirmationPage({
      searchParams: {
        payment_intent: 'pi_test_789',
        redirect_status: 'processing',
      },
    }))

    expect(screen.getByText(/payment processing/i)).toBeInTheDocument()
    expect(screen.getByText(/email you when confirmed/i)).toBeInTheDocument()
    expect(screen.queryByTestId('success-icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('error-icon')).not.toBeInTheDocument()
  })

  it('shows error UI when payment_intent param is missing', async () => {
    render(await ConfirmationPage({ searchParams: {} }))

    expect(
      screen.getByText(/something went wrong|invalid order/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /shop|checkout/i })
    ).toBeInTheDocument()
    // retrieve must NOT be called — no payment_intent to look up
    expect(mockRetrieve).not.toHaveBeenCalled()
  })

  it('displays formatted amount on success', async () => {
    mockRetrieve.mockResolvedValue({
      status: 'succeeded',
      amount: 149900, // paise → 1499 rupees
      currency: 'inr',
      metadata: { orderId: ORDER_ID },
    })
    vi.mocked(formatPrice).mockImplementation((amount: number) =>
      amount === 1499 ? '₹1,499' : `₹${amount}`
    )

    render(await ConfirmationPage({
      searchParams: {
        payment_intent: 'pi_test_amount',
        redirect_status: 'succeeded',
      },
    }))

    expect(screen.getByText('₹1,499')).toBeInTheDocument()
  })
})

describe('ConfirmationPage — Razorpay', () => {
  it('shows success UI for a captured Razorpay payment, verified live against Razorpay', async () => {
    mockFetchPayment.mockResolvedValue({
      id: 'pay_test_1',
      order_id: 'order_rzp_1',
      amount: 99900,
      currency: 'INR',
      status: 'captured',
      notes: { orderId: ORDER_ID },
    })

    render(await ConfirmationPage({
      searchParams: { razorpay_payment_id: 'pay_test_1' },
    }))

    expect(mockFetchPayment).toHaveBeenCalledWith('pay_test_1')
    expect(
      screen.getByRole('heading', { name: /payment successful|order confirmed/i })
    ).toBeInTheDocument()
    expect(screen.getByTestId('success-icon')).toBeInTheDocument()
    // A Razorpay id must never trigger a Stripe lookup, or vice versa.
    expect(mockRetrieve).not.toHaveBeenCalled()
  })

  it('shows failure UI for a failed Razorpay payment', async () => {
    mockFetchPayment.mockResolvedValue({
      id: 'pay_test_2',
      order_id: 'order_rzp_1',
      amount: 99900,
      currency: 'INR',
      status: 'failed',
      notes: { orderId: ORDER_ID },
    })

    render(await ConfirmationPage({
      searchParams: { razorpay_payment_id: 'pay_test_2' },
    }))

    expect(
      screen.getByRole('heading', { name: /payment failed/i })
    ).toBeInTheDocument()
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
  })

  it('shows processing UI for an authorized-but-not-captured Razorpay payment', async () => {
    mockFetchPayment.mockResolvedValue({
      id: 'pay_test_3',
      order_id: 'order_rzp_1',
      amount: 99900,
      currency: 'INR',
      status: 'authorized',
      notes: { orderId: ORDER_ID },
    })

    render(await ConfirmationPage({
      searchParams: { razorpay_payment_id: 'pay_test_3' },
    }))

    expect(screen.getByText(/payment processing/i)).toBeInTheDocument()
    expect(screen.queryByTestId('success-icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('error-icon')).not.toBeInTheDocument()
  })

  // The customer only ever reaches this URL via the success handler, but the
  // page must never take that as proof — it must reflect what Razorpay's API
  // actually reports for this payment id, not the fact that the id is present.
  it('never renders success from the param alone — a failed payment stays failed even though the URL implies success', async () => {
    mockFetchPayment.mockResolvedValue({
      id: 'pay_test_4',
      order_id: 'order_rzp_1',
      amount: 99900,
      currency: 'INR',
      status: 'failed',
      notes: { orderId: ORDER_ID },
    })

    render(await ConfirmationPage({
      searchParams: { razorpay_payment_id: 'pay_test_4' },
    }))

    expect(mockFetchPayment).toHaveBeenCalledWith('pay_test_4')
    expect(screen.queryByTestId('success-icon')).not.toBeInTheDocument()
  })
})

describe('ConfirmationPage — ownership gate', () => {
  it('404s when there is no session (Stripe)', async () => {
    vi.mocked(getSession).mockReturnValue(null)
    mockRetrieve.mockResolvedValue({
      status: 'succeeded',
      amount: 99900,
      currency: 'inr',
      metadata: { orderId: ORDER_ID },
    })

    await expect(
      ConfirmationPage({ searchParams: { payment_intent: 'pi_test_123' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })

  // notFound rather than a 403: telling a stranger the order exists is itself
  // a leak — same reasoning as order/[id]/page.tsx.
  it('404s for a customer who does not own the order (Stripe)', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-other', role: 'customer' })
    mockRetrieve.mockResolvedValue({
      status: 'succeeded',
      amount: 99900,
      currency: 'inr',
      metadata: { orderId: ORDER_ID },
    })

    await expect(
      ConfirmationPage({ searchParams: { payment_intent: 'pi_test_123' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s when the payment intent carries no resolvable orderId (Stripe)', async () => {
    mockRetrieve.mockResolvedValue({
      status: 'succeeded',
      amount: 99900,
      currency: 'inr',
      metadata: {},
    })

    await expect(
      ConfirmationPage({ searchParams: { payment_intent: 'pi_test_123' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s when there is no session (Razorpay)', async () => {
    vi.mocked(getSession).mockReturnValue(null)
    mockFetchPayment.mockResolvedValue({
      id: 'pay_test_1',
      order_id: 'order_rzp_1',
      amount: 99900,
      currency: 'INR',
      status: 'captured',
      notes: { orderId: ORDER_ID },
    })

    await expect(
      ConfirmationPage({ searchParams: { razorpay_payment_id: 'pay_test_1' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s for a customer who does not own the order (Razorpay)', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-other', role: 'customer' })
    mockFetchPayment.mockResolvedValue({
      id: 'pay_test_1',
      order_id: 'order_rzp_1',
      amount: 99900,
      currency: 'INR',
      status: 'captured',
      notes: { orderId: ORDER_ID },
    })

    await expect(
      ConfirmationPage({ searchParams: { razorpay_payment_id: 'pay_test_1' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s when the Razorpay payment carries no resolvable orderId', async () => {
    mockFetchPayment.mockResolvedValue({
      id: 'pay_test_1',
      order_id: 'order_rzp_1',
      amount: 99900,
      currency: 'INR',
      status: 'captured',
      notes: {},
    })

    await expect(
      ConfirmationPage({ searchParams: { razorpay_payment_id: 'pay_test_1' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
