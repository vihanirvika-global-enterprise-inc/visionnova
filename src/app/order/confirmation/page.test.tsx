import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('stripe')
vi.mock('@/lib/stripe', () => ({
  getServerStripe: vi.fn(),
}))
vi.mock('@/lib/formatters', () => ({
  formatPrice: vi.fn(),
}))

import { getServerStripe } from '@/lib/stripe'
import { formatPrice } from '@/lib/formatters'
import ConfirmationPage from './page'

const mockRetrieve = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerStripe).mockReturnValue({
    paymentIntents: { retrieve: mockRetrieve },
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
