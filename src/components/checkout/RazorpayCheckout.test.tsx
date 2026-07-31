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
  // callback exists to move the user along, nothing more.
  it('redirects to confirmation from the handler without advancing order state', async () => {
    render(<RazorpayCheckout {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /pay now/i }))
    await waitFor(() => expect(mockRazorpay).toHaveBeenCalled())

    const { handler } = mockRazorpay.mock.calls[0][0] as { handler: () => void }
    expect(typeof handler).toBe('function')
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
