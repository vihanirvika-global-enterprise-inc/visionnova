import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  vi.mocked(checkoutAction).mockResolvedValue({ orderId: 'order-1', totalAmount: 999, priceAdjusted: false })
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

    // totalAmount = 999 (from checkoutAction's server response) → 99900 paise
    await waitFor(() => expect(createPayment).toHaveBeenCalledWith(99900, 'order-1', 'IN'))
  })

  // The actual client-side half of the pricing fix: createPayment must use
  // checkoutAction's server-computed totalAmount, never the client cart's own
  // total — otherwise a tampered/stale client total still reaches the payment
  // gateway even though the order itself was priced correctly server-side.
  it('uses the server-computed total from checkoutAction for the payment amount, not the client cart total', async () => {
    vi.mocked(checkoutAction).mockResolvedValue({
      orderId: 'order-1', totalAmount: 1299, priceAdjusted: true,
    })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await fillNameAndEmail(user)
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    // client cart total is 999 (99900 paise) — must NOT be what's charged
    await waitFor(() => expect(createPayment).toHaveBeenCalledWith(129900, 'order-1', 'IN'))
  })

  it('shows a notice, not silence, when the server adjusts the price', async () => {
    vi.mocked(checkoutAction).mockResolvedValue({
      orderId: 'order-1', totalAmount: 1299, priceAdjusted: true,
    })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await fillNameAndEmail(user)
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/1299|price/i))
  })

  it('does not show a price-adjusted notice when the price did not change', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await fillNameAndEmail(user)
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(createPayment).toHaveBeenCalled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
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

// ── Accessibility of the checkout flow ───────────────────────────────────────
// Lighthouse scores this screen 100; none of the following is visible to it.

describe('CheckoutForm accessibility — status messages (finding 2)', () => {
  it('announces an error through a live region', async () => {
    vi.mocked(checkoutAction).mockResolvedValue({ error: 'City is required' })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    // Without role=alert a screen-reader user hears nothing at all on failure.
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('City is required')
  })
})

describe('CheckoutForm accessibility — step indicator (finding 3)', () => {
  it('exposes the steps as a list, not styled spans', () => {
    render(<CheckoutForm />)

    const steps = screen.getByRole('list', { name: /checkout progress/i })
    expect(within(steps).getAllByRole('listitem')).toHaveLength(2)
  })

  it('marks the shipping step current on arrival', () => {
    render(<CheckoutForm />)

    const current = screen.getByRole('listitem', { current: 'step' })
    expect(current).toHaveTextContent(/shipping/i)
  })

  it('moves the current marker to payment after the address step', async () => {
    render(<CheckoutForm />)
    await advanceToStripePaymentStep()

    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent(/payment/i)
  })
})

describe('CheckoutForm accessibility — busy state (finding 4)', () => {
  it('marks the submit button busy while the request is in flight', async () => {
    let release: (v: unknown) => void = () => {}
    vi.mocked(checkoutAction).mockReturnValue(new Promise((r) => { release = r }) as never)
    render(<CheckoutForm />)

    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: /continue to payment/i })
    await user.click(submit)

    expect(submit).toHaveAttribute('aria-busy', 'true')
    release({ error: 'stop' })
  })

  it('announces the in-flight state in a status region', async () => {
    let release: (v: unknown) => void = () => {}
    vi.mocked(checkoutAction).mockReturnValue(new Promise((r) => { release = r }) as never)
    render(<CheckoutForm />)

    await userEvent.setup().click(screen.getByRole('button', { name: /continue to payment/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/processing|please wait/i)
    release({ error: 'stop' })
  })

  it('is not busy before submission', () => {
    render(<CheckoutForm />)

    expect(screen.getByRole('button', { name: /continue to payment/i }))
      .toHaveAttribute('aria-busy', 'false')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('CheckoutForm accessibility — headings (finding 6)', () => {
  it('uses a real heading for the form section', () => {
    render(<CheckoutForm />)

    expect(screen.getByRole('heading', { name: /shipping & payment/i })).toBeInTheDocument()
  })

  it('gives the payment step its own heading', async () => {
    render(<CheckoutForm />)
    await advanceToStripePaymentStep()

    expect(screen.getByRole('heading', { name: /^payment$/i })).toBeInTheDocument()
  })
})

// Finding 1. Unit-tested here; still needs manual confirmation once real
// credentials make the payment step reachable in a browser.
describe('CheckoutForm accessibility — focus on step change (finding 1)', () => {
  it('moves focus into the payment step instead of dropping it to the body', async () => {
    render(<CheckoutForm />)
    await advanceToStripePaymentStep()

    const region = screen.getByRole('group', { name: /^payment$/i })
    await waitFor(() => expect(region).toHaveFocus())
    expect(document.activeElement).not.toBe(document.body)
  })
})
