'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getClientStripe } from '@/lib/stripe'
import { createPayment } from '@/app/checkout/payment-actions'
import { checkoutAction } from '@/app/checkout/actions'
import { SERVICEABLE_COUNTRIES } from '@/lib/serviceableRegions'
import { currencyForRegion } from '@/lib/currency'
import { regionForCountry } from '@/lib/region'
import RazorpayCheckout from './RazorpayCheckout'
import type { PaymentProviderName } from '@/lib/payments/provider'
import { formatAmountForStripe, formatPrice } from '@/lib/formatters'
import { useCart } from '@/components/cart/CartContext'
import { trackEvent } from '@/lib/analytics'
import type { CheckoutStep } from '@/types/stripe'

// ── Shared error card ─────────────────────────────────────────────────────────

// role="alert" so a failure is spoken. Without it a screen-reader user submits,
// the request fails, and nothing is announced at all.
function ErrorCard({
  message,
  actionHref,
  actionLabel,
}: {
  message: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div role="alert" className="card bg-red-50 border-red-200 p-3 mb-4">
      <div className="flex items-start gap-2">
        <svg aria-hidden="true"
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <div>
          <p className="text-red-700 text-sm">{message}</p>
          {actionHref && actionLabel && (
            <Link href={actionHref} className="text-sm font-medium text-red-700 underline hover:text-red-900">
              {actionLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AddressForm ───────────────────────────────────────────────────────────────

interface AddressFormData {
  fullName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pinCode: string
  country: string
}

type AddressFieldChangeEvent = React.ChangeEvent<
  HTMLInputElement | HTMLSelectElement
>

interface AddressFormProps {
  formData: AddressFormData
  onChange: (e: AddressFieldChangeEvent) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  error: string | null
  requiresPrescriptionUpload?: boolean
}

function AddressForm({
  formData, onChange, onSubmit, isLoading, error, requiresPrescriptionUpload,
}: AddressFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      {error && (
        <ErrorCard
          message={error}
          actionHref={requiresPrescriptionUpload ? '/prescription-upload' : undefined}
          actionLabel={requiresPrescriptionUpload ? 'Upload your prescription →' : undefined}
        />
      )}

      <div className="mb-4">
        <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-dark">
          Full Name
        </label>
        <input
          id="fullName" name="fullName" type="text" required
          value={formData.fullName} onChange={onChange} className="input-field"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-dark">
          Email
        </label>
        <input
          id="email" name="email" type="email" required
          value={formData.email} onChange={onChange} className="input-field"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-dark">
          Phone
        </label>
        <input
          id="phone" name="phone" type="tel" required
          value={formData.phone} onChange={onChange} className="input-field"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="addressLine1" className="mb-1 block text-sm font-medium text-dark">
          Address Line 1
        </label>
        <input
          id="addressLine1" name="addressLine1" type="text" required
          value={formData.addressLine1} onChange={onChange} className="input-field"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="addressLine2" className="mb-1 block text-sm font-medium text-dark">
          Address Line 2{' '}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="addressLine2" name="addressLine2" type="text"
          value={formData.addressLine2} onChange={onChange} className="input-field"
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="mb-1 block text-sm font-medium text-dark">
            City
          </label>
          <input
            id="city" name="city" type="text" required
            value={formData.city} onChange={onChange} className="input-field"
          />
        </div>
        <div>
          <label htmlFor="state" className="mb-1 block text-sm font-medium text-dark">
            State
          </label>
          <input
            id="state" name="state" type="text"
            value={formData.state} onChange={onChange} className="input-field"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="pinCode" className="mb-1 block text-sm font-medium text-dark">
            PIN Code
          </label>
          <input
            id="pinCode" name="pinCode" type="text"
            value={formData.pinCode} onChange={onChange} className="input-field"
          />
        </div>
        <div>
          <label htmlFor="country" className="mb-1 block text-sm font-medium text-dark">
            Country
          </label>
          <select
            id="country" name="country" required
            value={formData.country} onChange={onChange} className="input-field"
          >
            {SERVICEABLE_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Announced separately from the button: changing a button's label does
          not notify assistive tech, and disabling it drops focus. */}
      {isLoading ? (
        <p role="status" className="sr-only">
          Processing, please wait
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading}
        className="btn-primary w-full py-3 text-lg"
      >
        {isLoading ? 'Please wait...' : 'Continue to Payment'}
      </button>
    </form>
  )
}

// ── PaymentForm ───────────────────────────────────────────────────────────────

interface PaymentFormProps {
  onError: (message: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
}

function PaymentForm({ onError, isLoading, setIsLoading, error }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsLoading(true)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order/confirmation`,
      },
    })

    if (stripeError) {
      onError(stripeError.message ?? 'Payment failed')
      setIsLoading(false)
    }
    // On success Stripe redirects — no further handling needed
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorCard message={error} />}

      <PaymentElement className="mb-6" />

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-3 text-lg"
      >
        {isLoading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  )
}

// ── CheckoutForm (default export) ─────────────────────────────────────────────

const CHECKOUT_STEPS = [
  { key: 'address', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
] as const

const INITIAL_FORM: AddressFormData = {
  fullName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pinCode: '',
  country: 'IN',
}

export default function CheckoutForm() {
  const { items, total, couponCode } = useCart()
  const [step, setStep] = useState<CheckoutStep>('address')
  const [clientRef, setClientRef] = useState<string | null>(null)
  const [provider, setProvider] = useState<PaymentProviderName | null>(null)
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [requiresPrescriptionUpload, setRequiresPrescriptionUpload] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<AddressFormData>(INITIAL_FORM)
  // The server-recomputed total from checkoutAction — this, never the client
  // cart's own `total`, is what actually gets charged. The cart's total can
  // be stale (a price changed after it was added) or simply wrong (a tampered
  // client payload), so the payment amount must come from what the server
  // verified against the real product prices.
  const [serverTotal, setServerTotal] = useState<number | null>(null)
  const [priceAdjusted, setPriceAdjusted] = useState(false)
  const paymentRegionRef = useRef<HTMLDivElement>(null)

  // The address form unmounts on transition, destroying the focused button and
  // dropping focus to <body> — a keyboard user is silently returned to the top
  // of the page. Move focus into the payment region instead.
  useEffect(() => {
    if (step === 'payment') paymentRegionRef.current?.focus()
  }, [step])

  function handleChange(e: AddressFieldChangeEvent) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // The order must exist before the payment intent so its id can be carried in
  // the intent metadata — that is what the webhook uses to mark the order paid.
  function buildOrderFormData(): FormData {
    const fd = new FormData()
    fd.append('line1', formData.addressLine1)
    fd.append('city', formData.city)
    fd.append('state', formData.state)
    fd.append('postalCode', formData.pinCode)
    fd.append('country', formData.country)
    fd.append(
      'cart',
      JSON.stringify(
        items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          // Only used server-side to detect drift, never trusted as the
          // actual price — see checkoutAction.
          assumedPrice: item.product.price,
        }))
      )
    )
    if (couponCode) fd.append('couponCode', couponCode)
    return fd
  }

  async function handleAddressSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setRequiresPrescriptionUpload(false)

    const orderResult = await checkoutAction(buildOrderFormData())

    if ('error' in orderResult) {
      setError(orderResult.error)
      setRequiresPrescriptionUpload(orderResult.requiresPrescriptionUpload ?? false)
      setIsLoading(false)
      return
    }

    setServerTotal(orderResult.totalAmount)
    setPriceAdjusted(orderResult.priceAdjusted)

    // The server decides the gateway from the shipping country, so the routing
    // rule is not duplicated in the browser. orderResult.totalAmount, not the
    // client cart's `total`, is what's actually charged — see checkoutAction.
    const result = await createPayment(
      formatAmountForStripe(orderResult.totalAmount),
      orderResult.orderId,
      formData.country
    )

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    setProvider(result.provider ?? null)
    setClientRef(result.clientRef ?? null)
    setRazorpayKeyId(result.keyId ?? null)
    setStep('payment')
    setIsLoading(false)
    trackEvent({ event: 'checkout_started', total: orderResult.totalAmount, itemCount: items.length })
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-dark">Shipping &amp; Payment</h2>

      {/* A real list with aria-current, matching OrderStatusTimeline. Previously
          the current step was conveyed by font weight and colour alone. */}
      <ol aria-label="Checkout progress" className="mb-8 flex items-center gap-2">
        {CHECKOUT_STEPS.map((checkoutStep, index) => {
          const isCurrent =
            checkoutStep.key === 'address' ? step === 'address' : step !== 'address'
          return (
            <li
              key={checkoutStep.key}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex items-center gap-2"
            >
              {index > 0 ? (
                <span aria-hidden="true" className="mx-2 text-muted">
                  →
                </span>
              ) : null}
              <span className={isCurrent ? 'font-semibold text-primary' : 'text-muted'}>
                {index + 1} {checkoutStep.label}
              </span>
            </li>
          )
        })}
      </ol>

      {step === 'address' && (
        <AddressForm
          formData={formData}
          onChange={handleChange}
          onSubmit={handleAddressSubmit}
          isLoading={isLoading}
          error={error}
          requiresPrescriptionUpload={requiresPrescriptionUpload}
        />
      )}

      {step === 'payment' && clientRef ? (
        <div
          ref={paymentRegionRef}
          tabIndex={-1}
          role="group"
          aria-labelledby="payment-step-heading"
        >
          <h3 id="payment-step-heading" className="mb-4 text-base font-semibold text-dark">
            Payment
          </h3>

          {/* Not an error — role="status" (polite), not role="alert" — but a
              genuine price change must never be silent. */}
          {priceAdjusted && serverTotal !== null && (
            <div role="status" className="card mb-4 border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                Some prices were updated since you added these items to your cart.
                Your total is now {formatPrice(serverTotal)}.
              </p>
            </div>
          )}

          {provider === 'stripe' ? (
            <Elements stripe={getClientStripe()} options={{ clientSecret: clientRef }}>
              <PaymentForm
                onError={setError}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                error={error}
              />
            </Elements>
          ) : null}

          {provider === 'razorpay' && razorpayKeyId ? (
            <>
              {error && <ErrorCard message={error} />}
              <RazorpayCheckout
                razorpayOrderId={clientRef}
                keyId={razorpayKeyId}
                amountInPaise={formatAmountForStripe(serverTotal ?? total)}
                currency={currencyForRegion(regionForCountry(formData.country))}
                onError={setError}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
