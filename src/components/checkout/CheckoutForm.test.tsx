import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// @stripe/react-stripe-js — Elements renders children; PaymentElement is a traceable stub
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: vi.fn(),
  useElements: vi.fn(),
}))

vi.mock('@/app/checkout/stripe-actions', () => ({
  createPaymentIntent: vi.fn(),
}))

vi.mock('@/app/checkout/actions', () => ({
  checkoutAction: vi.fn(),
}))

vi.mock('@/lib/formatters', () => ({
  formatAmountForStripe: (amount: number) => Math.round(amount * 100),
  formatPrice: (amount: number) => `₹${amount}`,
}))

vi.mock('@/components/cart/CartContext', () => ({
  useCart: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  getClientStripe: vi.fn(() => Promise.resolve(null)),
}))

import { useStripe, useElements } from '@stripe/react-stripe-js'
import { createPaymentIntent } from '@/app/checkout/stripe-actions'
import { checkoutAction } from '@/app/checkout/actions'
import { useCart } from '@/components/cart/CartContext'
import CheckoutForm from './CheckoutForm'

function setupDefaultMocks() {
  vi.mocked(useCart).mockReturnValue({
    items: [{ product: { id: '1', name: 'Classic Frame', price: 999 }, quantity: 1 }] as any,
    total: 999,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
  })
  vi.mocked(useStripe).mockReturnValue({
    confirmPayment: vi.fn().mockResolvedValue({}),
  } as any)
  vi.mocked(useElements).mockReturnValue({} as any)
  vi.mocked(createPaymentIntent).mockResolvedValue({ clientSecret: 'pi_test_secret' })
  vi.mocked(checkoutAction).mockResolvedValue({ orderId: 'order-1' })
}

beforeEach(() => {
  vi.clearAllMocks()
  setupDefaultMocks()
})

// Fills the address form and waits until the payment step renders.
// Used by tests 3, 5, 6 which start from 'payment' step.
async function advanceToPaymentStep() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/full name/i), 'Test User')
  await user.type(screen.getByLabelText(/email/i), 'test@test.com')
  await user.click(screen.getByRole('button', { name: /continue to payment/i }))
  await waitFor(() =>
    expect(screen.getByTestId('payment-element')).toBeInTheDocument()
  )
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CheckoutForm', () => {
  it('renders address form by default (step = address)', () => {
    render(<CheckoutForm />)

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/pin code/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeInTheDocument()
    expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument()
  })

  it('calls createPaymentIntent with correct paise amount and orderId on address submit', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email/i), 'test@test.com')
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    // total = 999 rupees → formatAmountForStripe(999) = 99900 paise
    await waitFor(() => {
      expect(createPaymentIntent).toHaveBeenCalledWith(99900, 'order-1')
    })
  })

  it('creates the order before the payment intent', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email/i), 'test@test.com')
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(createPaymentIntent).toHaveBeenCalled())
    expect(checkoutAction).toHaveBeenCalledWith(expect.any(FormData))
    expect(vi.mocked(checkoutAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createPaymentIntent).mock.invocationCallOrder[0]
    )
  })

  it('stays on the address step and shows the error when order creation fails', async () => {
    vi.mocked(checkoutAction).mockResolvedValue({ error: 'City is required' })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => {
      expect(screen.getByText('City is required')).toBeInTheDocument()
    })
    expect(createPaymentIntent).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })

  it('renders country as a select defaulting to IN, not a free-text input', () => {
    render(<CheckoutForm />)

    const country = screen.getByLabelText(/country/i)
    expect(country.tagName).toBe('SELECT')
    expect(country).toHaveValue('IN')
  })

  it('offers India as a selectable country option', () => {
    render(<CheckoutForm />)

    expect(
      screen.getByRole('option', { name: 'India' })
    ).toHaveValue('IN')
  })

  it('submits the selected country code, not a country name', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText(/country/i), 'US')
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(checkoutAction).toHaveBeenCalled())
    const submitted = vi.mocked(checkoutAction).mock.calls[0][0] as FormData
    expect(submitted.get('country')).toBe('US')
  })

  it('shows PaymentElement after clientSecret is returned (step → payment)', async () => {
    render(<CheckoutForm />)
    await advanceToPaymentStep()

    expect(screen.getByTestId('payment-element')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pay now/i })).toBeInTheDocument()
    // address form is gone
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument()
  })

  it('shows error card if createPaymentIntent returns an error', async () => {
    vi.mocked(createPaymentIntent).mockResolvedValue({ error: 'Card declined' })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/email/i), 'test@test.com')
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => {
      expect(screen.getByText('Card declined')).toBeInTheDocument()
    })
    // still on address step — user can fix and retry
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })

  it('shows "Processing..." and disables the button while confirmPayment is in flight', async () => {
    vi.mocked(useStripe).mockReturnValue({
      confirmPayment: vi.fn().mockImplementation(() => new Promise(() => {})), // never resolves
    } as any)

    render(<CheckoutForm />)
    await advanceToPaymentStep()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /pay now/i }))

    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled()
  })

  it('shows confirmPayment error and stays on payment step', async () => {
    vi.mocked(useStripe).mockReturnValue({
      confirmPayment: vi.fn().mockResolvedValue({
        error: { message: 'Insufficient funds' },
      }),
    } as any)

    render(<CheckoutForm />)
    await advanceToPaymentStep()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /pay now/i }))

    await waitFor(() => {
      expect(screen.getByText('Insufficient funds')).toBeInTheDocument()
    })
    // still on payment step — not redirected to address or confirmation
    expect(screen.getByRole('button', { name: /pay now/i })).toBeInTheDocument()
  })
})
