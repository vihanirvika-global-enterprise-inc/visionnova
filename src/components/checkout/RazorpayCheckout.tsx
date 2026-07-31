'use client'

import { useState } from 'react'
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

  function handlePay() {
    const Razorpay = window.Razorpay
    if (!Razorpay) {
      onError('Payment gateway is not loaded yet. Please try again in a moment.')
      return
    }

    setIsLoading(true)

    const checkout = new Razorpay({
      key: keyId,
      order_id: razorpayOrderId,
      amount: amountInPaise,
      currency,
      name: 'VisionNova',
      // UX only. The webhook is the sole authority on order state — this must
      // never mark anything paid, or a closed browser would lose the order.
      handler: () => {
        window.location.assign('/order/confirmation')
      },
      modal: {
        ondismiss: () => setIsLoading(false),
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

      <button
        type="button"
        onClick={handlePay}
        disabled={isLoading}
        className="btn-primary w-full py-3 text-lg"
      >
        {isLoading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  )
}
