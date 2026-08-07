import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
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

vi.mock('@/lib/pincodeLookup', () => ({
  lookupPincode: vi.fn(),
}))

import { useStripe, useElements } from '@stripe/react-stripe-js'
import { createPayment } from '@/app/checkout/payment-actions'
import { checkoutAction } from '@/app/checkout/actions'
import { useCart } from '@/components/cart/CartContext'
import { INDIAN_STATES } from '@/lib/indiaAddress'
import { lookupPincode } from '@/lib/pincodeLookup'
import CheckoutForm from './CheckoutForm'

function setupDefaultMocks() {
  vi.mocked(useCart).mockReturnValue({
    items: [{ product: { id: '1', name: 'Classic Frame', price: 999 }, quantity: 1 }] as any,
    total: 999,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    couponCode: null,
    setCouponCode: vi.fn(),
  })
  vi.mocked(useStripe).mockReturnValue({
    confirmPayment: vi.fn().mockResolvedValue({}),
  } as any)
  vi.mocked(useElements).mockReturnValue({} as any)
  vi.mocked(checkoutAction).mockResolvedValue({
    orderId: 'order-1', totalAmount: 999, priceAdjusted: false, discount: 0,
  })
  // Default country is IN, so the default provider is Razorpay.
  vi.mocked(createPayment).mockResolvedValue({
    provider: 'razorpay',
    clientRef: 'order_rzp_1',
    keyId: 'rzp_test_key',
  })
  // Filling a valid address sets a PIN, which starts a lookup — so every test
  // needs this resolving to something, not to undefined.
  vi.mocked(lookupPincode).mockResolvedValue({
    status: 'found', districts: ['Krishna'], state: 'Andhra Pradesh',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setupDefaultMocks()
})

// The address form now runs the server's own validation before submitting,
// so reaching the payment step requires a complete, valid Indian address.
// fireEvent rather than userEvent: this runs before almost every test here and
// setting seven fields a keystroke at a time dominated the suite's runtime.
function fillValidAddress() {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } })
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } })
  fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '9876543210' } })
  fireEvent.change(screen.getByLabelText(/address line 1/i), { target: { value: '22-1-53, Balaji Nagar' } })
  fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Vijayawada' } })
  fireEvent.change(screen.getByLabelText(/state/i), { target: { value: 'Andhra Pradesh' } })
  fireEvent.change(screen.getByLabelText(/pin code/i), { target: { value: '520010' } })
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
  fillValidAddress()
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

  // Free text is how "andhrapradesh" reached the order record. A dropdown
  // makes the canonical spelling the only thing that can be submitted.
  it('renders state as a select, not a free-text input', () => {
    render(<CheckoutForm />)

    expect(screen.getByLabelText(/state/i).tagName).toBe('SELECT')
  })

  it('offers every Indian state and union territory', () => {
    render(<CheckoutForm />)

    const state = screen.getByLabelText(/state/i)
    // 36 entries plus the unselected placeholder.
    expect(within(state).getAllByRole('option')).toHaveLength(INDIAN_STATES.length + 1)
    for (const name of ['Andhra Pradesh', 'Karnataka', 'Lakshadweep', 'West Bengal']) {
      expect(within(state).getByRole('option', { name })).toBeInTheDocument()
    }
  })

  // No default: pre-selecting a state would silently ship orders to whichever
  // one happened to sort first.
  it('starts with no state selected', () => {
    render(<CheckoutForm />)

    expect(screen.getByLabelText(/state/i)).toHaveValue('')
  })

  it('records the chosen state', async () => {
    const user = userEvent.setup()
    render(<CheckoutForm />)

    await user.selectOptions(screen.getByLabelText(/state/i), 'Andhra Pradesh')

    expect(screen.getByLabelText(/state/i)).toHaveValue('Andhra Pradesh')
  })

  // Offering a country we refuse at the end is a dead end: the customer fills
  // the whole form before being told. The select shows only what we serve.
  it('offers only serviceable countries', () => {
    render(<CheckoutForm />)

    // Scoped to the country select — the state dropdown contributes options
    // of its own, and this assertion is about which countries are offered.
    const country = screen.getByLabelText(/country/i)
    expect(within(country).getAllByRole('option')).toHaveLength(1)
    expect(within(country).queryByRole('option', { name: 'United States' })).not.toBeInTheDocument()
    expect(within(country).queryByRole('option', { name: 'Germany' })).not.toBeInTheDocument()
  })

  it('submits a country code, not a country name', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(checkoutAction).toHaveBeenCalled())
    const submitted = vi.mocked(checkoutAction).mock.calls[0][0] as FormData
    expect(submitted.get('country')).toBe('IN')
    expect(submitted.get('country')).not.toBe('India')
  })

  // The coupon code lives in CartContext (so it survives the /cart ->
  // /checkout client-side navigation) — checkoutAction is the only place
  // that re-validates it, so it has to actually reach the submitted form.
  it('includes the coupon code from CartContext in the submitted form data', async () => {
    vi.mocked(useCart).mockReturnValue({
      items: [{ product: { id: '1', name: 'Classic Frame', price: 999 }, quantity: 1 }] as any,
      total: 999,
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      updateQuantity: vi.fn(),
      couponCode: 'SAVE10',
      setCouponCode: vi.fn(),
    })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(checkoutAction).toHaveBeenCalled())
    const submitted = vi.mocked(checkoutAction).mock.calls[0][0] as FormData
    expect(submitted.get('couponCode')).toBe('SAVE10')
  })

  it('creates the order before the payment', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(createPayment).toHaveBeenCalled())
    expect(vi.mocked(checkoutAction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createPayment).mock.invocationCallOrder[0]
    )
  })

  it('passes paise, orderId and the selected country to createPayment', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
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
      orderId: 'order-1', totalAmount: 1299, priceAdjusted: true, discount: 0,
    })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    // client cart total is 999 (99900 paise) — must NOT be what's charged
    await waitFor(() => expect(createPayment).toHaveBeenCalledWith(129900, 'order-1', 'IN'))
  })

  it('shows a notice, not silence, when the server adjusts the price', async () => {
    vi.mocked(checkoutAction).mockResolvedValue({
      orderId: 'order-1', totalAmount: 1299, priceAdjusted: true, discount: 0,
    })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/1299|price/i))
  })

  it('does not show a price-adjusted notice when the price did not change', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(createPayment).toHaveBeenCalled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('stays on the address step and shows the error when order creation fails', async () => {
    vi.mocked(checkoutAction).mockResolvedValue({ error: 'City is required' })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(screen.getByText('City is required')).toBeInTheDocument())
    expect(createPayment).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })

  // There is currently zero linkage between cart/checkout and
  // /prescription-upload — a customer blocked here needs an actual next step,
  // not a dead end that just says "no" with nowhere to go.
  it('links to prescription upload when checkout is blocked on a missing approved prescription', async () => {
    vi.mocked(checkoutAction).mockResolvedValue({
      error: 'One or more items require an approved prescription. Please upload and complete prescription review before checkout.',
      requiresPrescriptionUpload: true,
    })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(screen.getByText(/approved prescription/i)).toBeInTheDocument())
    const link = screen.getByRole('link', { name: /upload/i })
    expect(link).toHaveAttribute('href', '/prescription-upload')
  })

  it('does not render an upload link for an ordinary checkout error', async () => {
    vi.mocked(checkoutAction).mockResolvedValue({ error: 'City is required' })
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(screen.getByText('City is required')).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: /upload/i })).not.toBeInTheDocument()
  })
})

// ST-010 (A10. Checkout — 3-step: address / confirm-rx / payment). The
// confirm-rx step only exists when checkoutAction's result carries a
// prescriptionId — every test above uses the default mock, which doesn't,
// so those all correctly exercise the plain 2-step path unaffected.
describe('CheckoutForm — Rx confirmation step', () => {
  async function advanceToConfirmRxStep() {
    const user = userEvent.setup()
    vi.mocked(checkoutAction).mockResolvedValue({
      orderId: 'order-1', totalAmount: 999, priceAdjusted: false, discount: 0,
      prescriptionId: 'rx-1',
    })
    fillValidAddress()
    await user.click(screen.getByRole('button', { name: /continue to payment/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: /confirm prescription/i })).toBeInTheDocument())
  }

  it('shows the confirm-rx step instead of going straight to payment when the order needs one', async () => {
    render(<CheckoutForm />)
    await advanceToConfirmRxStep()

    expect(createPayment).not.toHaveBeenCalled()
    expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument()
    expect(screen.queryByTestId('razorpay-checkout')).not.toBeInTheDocument()
  })

  it('renders 3 progress steps, not 2, when confirm-rx applies', async () => {
    render(<CheckoutForm />)
    await advanceToConfirmRxStep()

    const steps = screen.getByRole('list', { name: /checkout progress/i })
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent(/confirm prescription/i)
  })

  it('only initiates payment after the customer continues from confirm-rx', async () => {
    render(<CheckoutForm />)
    await advanceToConfirmRxStep()

    // No address fill here: the confirm-rx step's button carries the same
    // label, and by this point the address form has unmounted.
    await userEvent.setup().click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(createPayment).toHaveBeenCalledWith(99900, 'order-1', 'IN'))
    expect(await screen.findByTestId('razorpay-checkout')).toBeInTheDocument()
  })

  it('moves focus into the confirm-rx region on arrival', async () => {
    render(<CheckoutForm />)
    await advanceToConfirmRxStep()

    const region = screen.getByRole('group', { name: /confirm prescription/i })
    await waitFor(() => expect(region).toHaveFocus())
  })
})

describe('CheckoutForm payment method selection', () => {
  it('renders Razorpay for an Indian address', async () => {
    render(<CheckoutForm />)

    const user = userEvent.setup()
    fillValidAddress()
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
    fillValidAddress()
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
    fillValidAddress()
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
    fillValidAddress()
    const submit = screen.getByRole('button', { name: /continue to payment/i })
    await user.click(submit)

    expect(submit).toHaveAttribute('aria-busy', 'true')
    release({ error: 'stop' })
  })

  it('announces the in-flight state in a status region', async () => {
    let release: (v: unknown) => void = () => {}
    vi.mocked(checkoutAction).mockReturnValue(new Promise((r) => { release = r }) as never)
    render(<CheckoutForm />)

    fillValidAddress()
    await userEvent.setup().click(screen.getByRole('button', { name: /continue to payment/i }))

    // findAllByRole, not findByRole: the PIN lookup owns a status region of
    // its own now, so asserting a single one on the page would be asserting
    // something this form no longer promises.
    const statuses = await screen.findAllByRole('status')
    expect(statuses.some((el) => /processing|please wait/i.test(el.textContent ?? ''))).toBe(true)
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

// ── PIN-code autofill ────────────────────────────────────────────────────────

// Real timers, and the PIN is driven with fireEvent rather than userEvent.
// userEvent's internal waits deadlock against vi.useFakeTimers here, and the
// debounce is observable without faking the clock anyway: each change event
// restarts it, so what matters is how many lookups a sequence produces, not
// what the clock reads. Every case drives the mocked lookup — the real India
// Post API is never contacted from a test.
describe('CheckoutForm — PIN code autofill', () => {
  const KRISHNA = {
    status: 'found' as const,
    districts: ['Krishna'],
    state: 'Andhra Pradesh' as const,
  }

  const TWO_DISTRICTS = {
    status: 'found' as const,
    districts: ['Guntur', 'Krishna'],
    state: 'Andhra Pradesh' as const,
  }

  // Types the PIN one digit at a time, as a person would — so the debounce is
  // being asked to collapse six change events, not one.
  function typePin(value: string) {
    const field = screen.getByLabelText(/pin code/i)
    for (let length = 1; length <= value.length; length++) {
      fireEvent.change(field, { target: { value: value.slice(0, length) } })
    }
    return field
  }

  beforeEach(() => {
    vi.mocked(lookupPincode).mockResolvedValue(KRISHNA)
  })

  // Firing per keystroke would mean five wasted requests on the way to every
  // six-digit PIN.
  it('does not look anything up until the PIN is a complete valid six digits', async () => {
    render(<CheckoutForm />)

    typePin('52001')
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(lookupPincode).not.toHaveBeenCalled()
    expect(screen.queryByText(/looking up/i)).not.toBeInTheDocument()
  })

  it('debounces so a fully typed PIN produces exactly one lookup', async () => {
    render(<CheckoutForm />)

    typePin('520010')
    await waitFor(() => expect(lookupPincode).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(lookupPincode).toHaveBeenCalledTimes(1)
    expect(lookupPincode).toHaveBeenCalledWith('520010')
  })

  it('shows a looking-up note while the request is in flight', () => {
    render(<CheckoutForm />)

    typePin('520010')

    expect(screen.getByText(/looking up/i)).toBeInTheDocument()
  })

  it('fills City and State from the lookup', async () => {
    render(<CheckoutForm />)

    typePin('520010')

    await waitFor(() => expect(screen.getByLabelText(/city/i)).toHaveValue('Krishna'))
    expect(screen.getByLabelText(/state/i)).toHaveValue('Andhra Pradesh')
    expect(screen.queryByText(/looking up/i)).not.toBeInTheDocument()
  })

  // The post-office district is not always what someone calls their city.
  it('leaves an auto-filled City editable', async () => {
    render(<CheckoutForm />)

    typePin('520010')
    await waitFor(() => expect(screen.getByLabelText(/city/i)).toHaveValue('Krishna'))

    const city = screen.getByLabelText(/city/i)
    expect(city).toBeEnabled()
    expect(city).not.toHaveAttribute('readonly')

    fireEvent.change(city, { target: { value: 'Vijayawada' } })
    expect(city).toHaveValue('Vijayawada')
  })

  it('offers the choice instead of guessing when a PIN spans districts', async () => {
    vi.mocked(lookupPincode).mockResolvedValue(TWO_DISTRICTS)
    render(<CheckoutForm />)

    typePin('520010')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Guntur' })).toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: 'Krishna' })).toBeInTheDocument()
    // Nothing guessed into the field.
    expect(screen.getByLabelText(/city/i)).toHaveValue('')
    // State is unambiguous even when the district is not.
    expect(screen.getByLabelText(/state/i)).toHaveValue('Andhra Pradesh')
  })

  it('fills City from the district the customer picks', async () => {
    vi.mocked(lookupPincode).mockResolvedValue(TWO_DISTRICTS)
    render(<CheckoutForm />)

    typePin('520010')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Krishna' })).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: 'Krishna' }))

    expect(screen.getByLabelText(/city/i)).toHaveValue('Krishna')
    expect(screen.queryByRole('button', { name: 'Guntur' })).not.toBeInTheDocument()
  })

  // A convenience feature must never become a wall. Both failure outcomes
  // leave the customer able to finish the form by hand.
  it('falls back to manual entry when the lookup is unavailable', async () => {
    vi.mocked(lookupPincode).mockResolvedValue({ status: 'unavailable' })
    render(<CheckoutForm />)

    typePin('520010')

    await waitFor(() =>
      expect(screen.getByText(/enter city and state/i)).toBeInTheDocument()
    )
    expect(screen.getByLabelText(/city/i)).toBeEnabled()
    expect(screen.getByLabelText(/state/i)).toBeEnabled()
  })

  it('reports an unknown PIN without blocking the form', async () => {
    vi.mocked(lookupPincode).mockResolvedValue({ status: 'not-found' })
    render(<CheckoutForm />)

    typePin('520010')

    await waitFor(() =>
      expect(screen.getByText(/could not find that pin code/i)).toBeInTheDocument()
    )
    expect(screen.getByLabelText(/city/i)).toBeEnabled()
  })

  // Non-blocking means polite, not assertive: a lookup outcome is not an
  // error the customer has to resolve before continuing.
  it('announces lookup outcomes politely, not as errors', async () => {
    vi.mocked(lookupPincode).mockResolvedValue({ status: 'unavailable' })
    render(<CheckoutForm />)

    typePin('520010')

    const note = await screen.findByText(/enter city and state/i)
    expect(note.closest('[role="alert"]')).toBeNull()
    expect(note.closest('[role="status"]')).not.toBeNull()
  })

  it('clears the lookup note once the PIN is no longer complete', async () => {
    render(<CheckoutForm />)

    const field = typePin('520010')
    await waitFor(() => expect(screen.getByLabelText(/city/i)).toHaveValue('Krishna'))

    fireEvent.change(field, { target: { value: '52001' } })

    expect(screen.queryByText(/looking up/i)).not.toBeInTheDocument()
  })

  // A response that arrives after the PIN has moved on must not write a city
  // for a PIN the customer is no longer entering.
  it('ignores a response that arrives after the PIN has changed', async () => {
    vi.mocked(lookupPincode).mockResolvedValue(KRISHNA)
    render(<CheckoutForm />)

    const field = typePin('520010')
    fireEvent.change(field, { target: { value: '52001' } })
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(screen.getByLabelText(/city/i)).toHaveValue('')
  })
})

// ── Field semantics ──────────────────────────────────────────────────────────

describe('CheckoutForm — numeric field affordances', () => {
  it('gives PIN Code a numeric keypad and a six-character cap', () => {
    render(<CheckoutForm />)

    const pin = screen.getByLabelText(/pin code/i)
    expect(pin).toHaveAttribute('inputmode', 'numeric')
    expect(pin).toHaveAttribute('maxlength', '6')
  })

  // inputMode "tel" rather than "numeric": the validator accepts a +91
  // prefix, and the numeric keypad on iOS has no "+" key at all — so
  // "numeric" would make a documented-valid input impossible to type.
  it('gives Phone a phone keypad and a cap that still fits +91 and spaces', () => {
    render(<CheckoutForm />)

    const phone = screen.getByLabelText(/phone/i)
    expect(phone).toHaveAttribute('inputmode', 'tel')
    // '+91 98765 43210' is 15 characters.
    expect(phone).toHaveAttribute('maxlength', '15')
  })

  it('labels the contact fields for autofill', () => {
    render(<CheckoutForm />)

    expect(screen.getByLabelText(/phone/i)).toHaveAttribute('autocomplete', 'tel')
    expect(screen.getByLabelText(/pin code/i)).toHaveAttribute('autocomplete', 'postal-code')
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('autocomplete', 'name')
  })
})

// ── Client-side field validation ─────────────────────────────────────────────

// The same rules the server runs, run in the browser too, so a bad phone is
// caught before a round trip instead of after one. The shared implementation
// lives in lib/shippingAddress.ts precisely so the two cannot drift.
describe('CheckoutForm — field-level validation', () => {
  function fillValidAddress() {
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Hemanth Kakarla' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'hemanth@example.com' } })
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByLabelText(/address line 1/i), { target: { value: '22-1-53, Balaji Nagar' } })
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Vijayawada' } })
    fireEvent.change(screen.getByLabelText(/state/i), { target: { value: 'Andhra Pradesh' } })
    fireEvent.change(screen.getByLabelText(/pin code/i), { target: { value: '520010' } })
  }

  beforeEach(() => {
    vi.mocked(lookupPincode).mockResolvedValue({
      status: 'found', districts: ['Krishna'], state: 'Andhra Pradesh',
    })
  })

  it('submits to the server when every field is valid', async () => {
    render(<CheckoutForm />)
    fillValidAddress()

    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(checkoutAction).toHaveBeenCalled())
  })

  // The reported defect, caught in the browser this time.
  it('rejects free-text in Phone without contacting the server', async () => {
    render(<CheckoutForm />)
    fillValidAddress()
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: '22-1-53 A Balaji nagar' },
    })

    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() =>
      expect(screen.getByText(/valid 10-digit indian mobile number/i)).toBeInTheDocument()
    )
    expect(checkoutAction).not.toHaveBeenCalled()
  })

  it('marks the offending field invalid for assistive tech', async () => {
    render(<CheckoutForm />)
    fillValidAddress()
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '5876543210' } })

    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() =>
      expect(screen.getByLabelText(/phone/i)).toHaveAttribute('aria-invalid', 'true')
    )
  })

  // aria-invalid alone says "something is wrong" without saying what.
  it('associates the message with the field that caused it', async () => {
    render(<CheckoutForm />)
    fillValidAddress()
    fireEvent.change(screen.getByLabelText(/pin code/i), { target: { value: '000000' } })

    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => {
      const pin = screen.getByLabelText(/pin code/i)
      const describedBy = pin.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      expect(document.getElementById(describedBy!)?.textContent).toMatch(/6-digit pin code/i)
    })
  })

  it('rejects an unselected state', async () => {
    render(<CheckoutForm />)
    fillValidAddress()
    fireEvent.change(screen.getByLabelText(/state/i), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() =>
      expect(screen.getByText(/valid indian state or union territory/i)).toBeInTheDocument()
    )
    expect(checkoutAction).not.toHaveBeenCalled()
  })

  it('reports every invalid field at once, not one per submit', async () => {
    render(<CheckoutForm />)

    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() =>
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument()
    expect(screen.getByText(/street address is required/i)).toBeInTheDocument()
    expect(checkoutAction).not.toHaveBeenCalled()
  })

  it('clears a field error once the value is corrected', async () => {
    render(<CheckoutForm />)
    fillValidAddress()
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '5876543210' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
    await waitFor(() =>
      expect(screen.getByText(/valid 10-digit indian mobile number/i)).toBeInTheDocument()
    )

    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '9876543210' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => expect(checkoutAction).toHaveBeenCalled())
    expect(screen.queryByText(/valid 10-digit indian mobile number/i)).not.toBeInTheDocument()
  })
})
