import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/script', () => ({
  default: ({ src, strategy }: { src: string; strategy: string }) => (
    <div data-testid="razorpay-script" data-src={src} data-strategy={strategy} />
  ),
}))

import RazorpayCheckout from './RazorpayCheckout'

const mockOpen = vi.fn()
// Must be a real function, not an arrow — the component calls `new Razorpay(...)`
// and arrows are not constructors.
const mockRazorpay = vi.fn(function (_options: Record<string, unknown>) {
  return { open: mockOpen }
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('Razorpay', mockRazorpay)
  // jsdom's window.location.assign isn't configurable for vi.spyOn, so replace
  // the whole location object — configurable so this can run again next test.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign: vi.fn() },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const defaultProps = {
  razorpayOrderId: 'order_rzp_1',
  keyId: 'rzp_test_key',
  amountInPaise: 99900,
  currency: 'INR',
  onError: vi.fn(),
}

describe('RazorpayCheckout', () => {
  it('loads checkout.js after the page is interactive', () => {
    render(<RazorpayCheckout {...defaultProps} />)

    const script = screen.getByTestId('razorpay-script')
    expect(script).toHaveAttribute('data-src', 'https://checkout.razorpay.com/v1/checkout.js')
    expect(script).toHaveAttribute('data-strategy', 'afterInteractive')
  })

  it('opens the Razorpay modal with the order id, key and amount', async () => {
    render(<RazorpayCheckout {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /pay now/i }))

    await waitFor(() => expect(mockRazorpay).toHaveBeenCalled())
    expect(mockRazorpay.mock.calls[0][0]).toMatchObject({
      key: 'rzp_test_key',
      order_id: 'order_rzp_1',
      amount: 99900,
      currency: 'INR',
    })
    expect(mockOpen).toHaveBeenCalled()
  })

  // The webhook is the only thing that advances order state. The browser
  // callback exists to move the user along, nothing more — it must not call
  // any API, only navigate.
  it('redirects to confirmation with the razorpay_payment_id from the handler', async () => {
    render(<RazorpayCheckout {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /pay now/i }))
    await waitFor(() => expect(mockRazorpay).toHaveBeenCalled())

    const { handler } = mockRazorpay.mock.calls[0][0] as {
      handler: (response: {
        razorpay_payment_id: string
        razorpay_order_id: string
        razorpay_signature: string
      }) => void
    }
    handler({
      razorpay_payment_id: 'pay_test_123',
      razorpay_order_id: 'order_rzp_1',
      razorpay_signature: 'sig_abc',
    })

    expect(window.location.assign).toHaveBeenCalledWith(
      '/order/confirmation?razorpay_payment_id=pay_test_123'
    )
  })

  it('reports an error when the script has not loaded yet', async () => {
    vi.stubGlobal('Razorpay', undefined)
    const onError = vi.fn()
    render(<RazorpayCheckout {...defaultProps} onError={onError} />)

    await userEvent.click(screen.getByRole('button', { name: /pay now/i }))

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/not loaded/i)))
    expect(mockOpen).not.toHaveBeenCalled()
  })
})

// Finding 5. Focus inside the modal is Razorpay's responsibility; returning it
// when the modal closes is ours. Unit-tested here, but still needs manual
// confirmation once real credentials make the modal reachable.
describe('RazorpayCheckout focus restoration', () => {
  it('returns focus to the pay button when the modal is dismissed', async () => {
    render(<RazorpayCheckout {...defaultProps} />)

    const payButton = screen.getByRole('button', { name: /pay now/i })
    await userEvent.click(payButton)
    await waitFor(() => expect(mockRazorpay).toHaveBeenCalled())

    const { modal } = mockRazorpay.mock.calls[0][0] as { modal: { ondismiss: () => void } }
    // Simulate Razorpay closing its overlay, which leaves focus wherever it was.
    ;(document.activeElement as HTMLElement)?.blur()
    modal.ondismiss()

    await waitFor(() => expect(payButton).toHaveFocus())
  })

  it('clears the busy state on dismissal so the button is usable again', async () => {
    render(<RazorpayCheckout {...defaultProps} />)

    const payButton = screen.getByRole('button', { name: /pay now/i })
    await userEvent.click(payButton)
    await waitFor(() => expect(mockRazorpay).toHaveBeenCalled())

    const { modal } = mockRazorpay.mock.calls[0][0] as { modal: { ondismiss: () => void } }
    modal.ondismiss()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /pay now/i })).not.toBeDisabled()
    )
  })

  it('announces a load failure through a live region', async () => {
    vi.stubGlobal('Razorpay', undefined)
    render(<RazorpayCheckout {...defaultProps} onError={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /pay now/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/not loaded/i)
  })
})
