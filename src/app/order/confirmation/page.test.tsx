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
const ORDER_ID = '8c1d5e02-3f47-4b90-a6d1-5e2c9b8a7d41'

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

// orders.id is a uuid column. The orderId here is not a path segment — it
// comes back from Stripe metadata or Razorpay notes — but it still reaches
// getOrderById unvalidated, so a payment carrying a malformed or legacy
// reference threw `invalid input syntax for type uuid` and 500'd the customer's
// confirmation page immediately after they paid. Same guard as /order/[id]
// and the PDP.
describe('ConfirmationPage — malformed order reference', () => {
  it('404s rather than 500s when Stripe metadata carries a non-UUID orderId', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    mockRetrieve.mockResolvedValue({
      id: 'pi_1', status: 'succeeded', amount: 99900, metadata: { orderId: 'order-1' },
    })

    await expect(
      ConfirmationPage({ searchParams: { payment_intent: 'pi_1' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(getOrderById).not.toHaveBeenCalled()
  })

  it('404s rather than 500s when Razorpay notes carry a non-UUID orderId', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    mockFetchPayment.mockResolvedValue({
      id: 'pay_1', status: 'captured', amount: 99900, notes: { orderId: '../../etc/passwd' },
    })

    await expect(
      ConfirmationPage({ searchParams: { razorpay_payment_id: 'pay_1' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(getOrderById).not.toHaveBeenCalled()
  })

  it('still looks up a well-formed order reference', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    givenOrder()
    mockRetrieve.mockResolvedValue({
      id: 'pi_1', status: 'succeeded', amount: 99900, metadata: { orderId: ORDER_ID },
    })

    render(await ConfirmationPage({ searchParams: { payment_intent: 'pi_1' } }))

    expect(getOrderById).toHaveBeenCalledWith(ORDER_ID)
  })
})

// A11 omission. The mockup offered "Download invoice"; no generator, PDF
// dependency or invoice-number series exists in this repo, and a GST invoice
// is a statutory document that needs a GSTIN we do not yet hold.
describe('ConfirmationPage — ships no invoice affordance', () => {
  it('offers no invoice download it cannot produce', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    givenOrder()
    mockRetrieve.mockResolvedValue({
      id: 'pi_1', status: 'succeeded', amount: 99900, metadata: { orderId: ORDER_ID },
    })

    const { container } = render(await ConfirmationPage({ searchParams: { payment_intent: 'pi_1' } }))

    expect(container.textContent ?? '').not.toMatch(/invoice|download/i)
    expect(screen.queryByRole('button', { name: /invoice|download/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /invoice|download/i })).not.toBeInTheDocument()
  })

  it('states no GSTIN or tax breakdown it cannot substantiate', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    givenOrder()
    mockRetrieve.mockResolvedValue({
      id: 'pi_1', status: 'succeeded', amount: 99900, metadata: { orderId: ORDER_ID },
    })

    const { container } = render(await ConfirmationPage({ searchParams: { payment_intent: 'pi_1' } }))

    expect(container.textContent ?? '').not.toMatch(/GSTIN|HSN|GST \(/i)
  })
})

// A stale, mistyped or replayed payment id made the provider lookup throw, and
// the customer got a 500 on the page they land on immediately after paying.
// The InvalidOrder UI already existed for the no-params case and says exactly
// the right thing — "contact support if you were charged" — so failures route
// there instead.
describe('ConfirmationPage — unresolvable payment reference', () => {
  it('shows the invalid-order UI when Stripe cannot resolve the intent', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    mockRetrieve.mockRejectedValue(new Error('No such payment_intent: junk'))

    render(await ConfirmationPage({ searchParams: { payment_intent: 'junk' } }))

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(screen.getByText(/contact support if you were charged/i)).toBeInTheDocument()
  })

  it('shows the invalid-order UI when Razorpay cannot resolve the payment', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    mockFetchPayment.mockRejectedValue(new Error('The id provided does not exist'))

    render(await ConfirmationPage({ searchParams: { razorpay_payment_id: 'junk' } }))

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
  })

  it('shows it when the provider client itself cannot be constructed', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: OWNER, role: 'customer' })
    vi.mocked(getServerRazorpay).mockImplementation(() => {
      throw new Error('RAZORPAY_KEY_ID is not set')
    })

    render(await ConfirmationPage({ searchParams: { razorpay_payment_id: 'pay_1' } }))

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
  })

  // The whole point of the PDP 404 investigation: a catch on this path must not
  // eat the not-found thrown by the ownership gate, or an order belonging to
  // someone else would render as a successful confirmation.
  it('still 404s for a non-owner — the catch must not swallow notFound', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-other', role: 'customer' })
    givenOrder()
    mockRetrieve.mockResolvedValue({
      id: 'pi_1', status: 'succeeded', amount: 99900, metadata: { orderId: ORDER_ID },
    })

    await expect(
      ConfirmationPage({ searchParams: { payment_intent: 'pi_1' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
