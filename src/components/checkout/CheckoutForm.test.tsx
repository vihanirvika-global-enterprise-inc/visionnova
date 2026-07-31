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

vi.mock('./RazorpayCheckout', () => ({
  default: ({ razorpayOrderId }: { razorpayOrderId: string }) => (
    <div data-testid="razorpay-checkout" data-order-id={razorpayOrderId} />
  ),
}))

vi.mock('@/app/checkout/payment-actions', () => ({
  createPayment: vi.fn(),
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
import { createPayment } from '@/app/checkout/payment-actions'
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
  vi.mocked(checkoutAction).mockResolvedValue({ orderId: 'order-1' })
  // Default country is IN, so the default provider is Razorpay.
  vi.mocked(createPayment).mockResolvedValue({
    provider: 'razorpay',
    clientRef: 'order_rzp_1',
    keyId: 'rzp_test_key',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setupDefaultMocks()
})

async function fillNameAndEmail(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), 'Test User')
  await user.type(screen.getByLabelText(/email/i), 'test@test.com')
}

// Drives the Stripe branch through the server response rather than the country
// select: only serviceable countries are selectable, so a non-IN address cannot
// be chosen in the UI. The branch still needs coverage for when GLOBAL opens.
async function advanceToStripePaymentStep() {
  const user = userEvent.setup()
  vi.mocked(createPayment).mockResolvedValue({
    provider: 'stripe',
    clientRef: 'pi_test_secret',
  })
  await fillNameAndEmail(user)
  await user.click(screen.getByRole('button', { name: /continue to payment/i }))
  await waitFor(() => expect(screen.getByTestId('payment-element')).toBeInTheDocument())
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CheckoutForm', () => {
  it('renders address form by default (step = address)', () => {
    render(<CheckoutForm />)

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeInTheDocument()
    expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument()
    expect(screen.queryByTestId('razorpay-checkout')).not.toBeInTheDocument()
  })

  it('renders country as a select defaulting to IN, not a free-text input', () => {
    render(<CheckoutForm />)

    const country = screen.getByLabelText(/country/i)
    expect(country.tagName).toBe('SELECT')
    expect(country).toHaveValue('IN')
  })

  it('offers India as a selectable country option', () => {
    render(<CheckoutForm />)

    expect(screen.getByRole('option', { name: 'India' })).toHaveValue('IN')
  })

  // Offering a country we refuse at the end is a dead end: the customer fills
  // the whole form before being told. The select shows only what we serve.
  it('offers only serviceable countries', () => {
    render(<CheckoutForm />)

    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.queryByRole('option', { name: 'United States' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Germany' })).not.toBeInTheDocument()
  })

  it('submits a country code, not a country name', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(checkoutAction).toHaveBeenCalled())
    const submitted = vi.mocked(checkoutAction).mock.calls[0][0] as FormData
    expect(submitted.get('country')).toBe('IN')
    expect(submitted.get('country')).not.toBe('India')
  })

  it('creates the order before the payment', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await fillNameAndEmail(user)
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(createPayment).toHaveBeenCalled())
    expect(vi.mocked(checkoutAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createPayment).mock.invocationCallOrder[0]
    )
  })

  it('passes paise, orderId and the selected country to createPayment', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await fillNameAndEmail(user)
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    // total = 999 rupees → 99900 paise
    await waitFor(() => expect(createPayment).toHaveBeenCalledWith(99900, 'order-1', 'IN'))
  })

  it('stays on the address step and shows the error when order creation fails', async () => {
    vi.mocked(checkoutAction).mockResolvedValue({ error: 'City is required' })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(screen.getByText('City is required')).toBeInTheDocument())
    expect(createPayment).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })
})

describe('CheckoutForm payment method selection', () => {
  it('renders Razorpay for an Indian address', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await fillNameAndEmail(user)
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(screen.getByTestId('razorpay-checkout')).toBeInTheDocument())
    expect(screen.getByTestId('razorpay-checkout')).toHaveAttribute(
      'data-order-id',
      'order_rzp_1'
    )
    expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument()
  })

  it('renders Stripe Elements for a non-Indian address', async () => {
    render(<CheckoutForm />)
    await advanceToStripePaymentStep()

    expect(screen.getByTestId('payment-element')).toBeInTheDocument()
    expect(screen.queryByTestId('razorpay-checkout')).not.toBeInTheDocument()
  })

  it('shows an error card if payment creation fails', async () => {
    vi.mocked(createPayment).mockResolvedValue({ error: 'Card declined' })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await fillNameAndEmail(user)
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(screen.getByText('Card declined')).toBeInTheDocument())
    // still on address step — user can fix and retry
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })
})

describe('CheckoutForm Stripe payment step', () => {
  it('shows "Processing..." and disables the button while confirmPayment is in flight', async () => {
    vi.mocked(useStripe).mockReturnValue({
      confirmPayment: vi.fn().mockImplementation(() => new Promise(() => {})),
    } as any)

    render(<CheckoutForm />)
    await advanceToStripePaymentStep()

    await userEvent.setup().click(screen.getByRole('button', { name: /pay now/i }))

    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled()
  })

  it('shows confirmPayment error and stays on payment step', async () => {
    vi.mocked(useStripe).mockReturnValue({
      confirmPayment: vi.fn().mockResolvedValue({ error: { message: 'Insufficient funds' } }),
    } as any)

    render(<CheckoutForm />)
    await advanceToStripePaymentStep()

    await userEvent.setup().click(screen.getByRole('button', { name: /pay now/i }))

    await waitFor(() => expect(screen.getByText('Insufficient funds')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /pay now/i })).toBeInTheDocument()
  })
})
