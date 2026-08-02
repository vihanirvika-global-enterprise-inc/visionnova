'use client'

import { useRef, useState } from 'react'
import Script from 'next/script'

interface RazorpayCheckoutProps {
  razorpayOrderId: string
  keyId: string
  amountInPaise: number
  currency: string
  onError: (message: string) => void
}

interface RazorpayInstance {
  open: () => void
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

export default function RazorpayCheckout({
  razorpayOrderId,
  keyId,
  amountInPaise,
  currency,
  onError,
}: RazorpayCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const payButtonRef = useRef<HTMLButtonElement>(null)

  function handlePay() {
    const Razorpay = window.Razorpay
    if (!Razorpay) {
      const message = 'Payment gateway is not loaded yet. Please try again in a moment.'
      // Announced here as well as reported upward: the parent's error card is
      // rendered outside this component and may not be reached by assistive tech
      // before the user tries again.
      setStatus(message)
      onError(message)
      return
    }

    setStatus(null)

    setIsLoading(true)

    const checkout = new Razorpay({
      key: keyId,
      order_id: razorpayOrderId,
      amount: amountInPaise,
      currency,
      name: 'VisionNova',
      // UX only. The webhook is the sole authority on order state — this must
      // never mark anything paid, or a closed browser would lose the order.
      // The confirmation page independently re-verifies this payment_id
      // against Razorpay's API before showing success.
      handler: (response: RazorpaySuccessResponse) => {
        window.location.assign(
          `/order/confirmation?razorpay_payment_id=${encodeURIComponent(response.razorpay_payment_id)}`
        )
      },
      modal: {
        ondismiss: () => {
          setIsLoading(false)
          // Razorpay manages focus inside its overlay; returning focus to the
          // control that opened it is ours. Without this, closing the modal
          // leaves a keyboard user with no focused element.
          payButtonRef.current?.focus()
        },
      },
    })

    checkout.open()
  }

  return (
    <div>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <p className="mb-4 text-sm text-muted">
        You will be redirected to Razorpay to complete your payment securely.
      </p>

      {status ? (
        <p role="status" className="mb-4 text-sm text-red-700">
          {status}
        </p>
      ) : null}

      <button
        ref={payButtonRef}
        type="button"
        onClick={handlePay}
        disabled={isLoading}
        aria-busy={isLoading}
        className="btn-primary w-full py-3 text-lg"
      >
        {isLoading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  )
}
