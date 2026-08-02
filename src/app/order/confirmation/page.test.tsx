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

import { getServerStripe } from '@/lib/stripe'
import { getServerRazorpay } from '@/lib/razorpay'
import { formatPrice } from '@/lib/formatters'
import ConfirmationPage from './page'

const mockRetrieve = vi.fn()
const mockFetchPayment = vi.fn()

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
})

describe('ConfirmationPage', () => {
  it('shows success UI when redirect_status=succeeded', async () => {
    mockRetrieve.mockResolvedValue({
      status: 'succeeded',
      amount: 99900,
      currency: 'inr',
      metadata: { source: 'visionnova_mvp' },
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
    })

    render(await ConfirmationPage({
      searchParams: { razorpay_payment_id: 'pay_test_4' },
    }))

    expect(mockFetchPayment).toHaveBeenCalledWith('pay_test_4')
    expect(screen.queryByTestId('success-icon')).not.toBeInTheDocument()
  })
})
