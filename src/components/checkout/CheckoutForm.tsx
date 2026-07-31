'use client'

import { useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getClientStripe } from '@/lib/stripe'
import { createPayment } from '@/app/checkout/payment-actions'
import { checkoutAction } from '@/app/checkout/actions'
import { COUNTRIES } from '@/lib/countries'
import { currencyForRegion } from '@/lib/currency'
import { regionForCountry } from '@/lib/region'
import RazorpayCheckout from './RazorpayCheckout'
import type { PaymentProviderName } from '@/lib/payments/provider'
import { formatAmountForStripe } from '@/lib/formatters'
import { useCart } from '@/components/cart/CartContext'
import { trackEvent } from '@/lib/analytics'
import type { CheckoutStep } from '@/types/stripe'

// ── Shared error card ─────────────────────────────────────────────────────────

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="card bg-red-50 border-red-200 p-3 mb-4">
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
        <p className="text-red-700 text-sm">{message}</p>
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
}

function AddressForm({ formData, onChange, onSubmit, isLoading, error }: AddressFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <ErrorCard message={error} />}

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
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
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
  const { items, total } = useCart()
  const [step, setStep] = useState<CheckoutStep>('address')
  const [clientRef, setClientRef] = useState<string | null>(null)
  const [provider, setProvider] = useState<PaymentProviderName | null>(null)
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<AddressFormData>(INITIAL_FORM)

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
          product: { id: item.product.id, price: item.product.price },
          quantity: item.quantity,
        }))
      )
    )
    return fd
  }

  async function handleAddressSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const orderResult = await checkoutAction(buildOrderFormData())

    if ('error' in orderResult) {
      setError(orderResult.error)
      setIsLoading(false)
      return
    }

    // The server decides the gateway from the shipping country, so the routing
    // rule is not duplicated in the browser.
    const result = await createPayment(
      formatAmountForStripe(total),
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
    trackEvent({ event: 'checkout_started', total, itemCount: items.length })
  }

  return (
    <div>
      <p className="mb-6 text-lg font-semibold text-dark">Shipping &amp; Payment</p>

      <div className="mb-8 flex items-center gap-2">
        <span className={step === 'address' ? 'font-semibold text-primary' : 'text-muted'}>
          1 Shipping
        </span>
        <span className="mx-2 text-muted">→</span>
        <span className={step !== 'address' ? 'font-semibold text-primary' : 'text-muted'}>
          2 Payment
        </span>
      </div>

      {step === 'address' && (
        <AddressForm
          formData={formData}
          onChange={handleChange}
          onSubmit={handleAddressSubmit}
          isLoading={isLoading}
          error={error}
        />
      )}

      {step === 'payment' && clientRef && provider === 'stripe' && (
        <Elements stripe={getClientStripe()} options={{ clientSecret: clientRef }}>
          <PaymentForm
            onError={setError}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            error={error}
          />
        </Elements>
      )}

      {step === 'payment' && clientRef && provider === 'razorpay' && razorpayKeyId && (
        <>
          {error && <ErrorCard message={error} />}
          <RazorpayCheckout
            razorpayOrderId={clientRef}
            keyId={razorpayKeyId}
            amountInPaise={formatAmountForStripe(total)}
            currency={currencyForRegion(regionForCountry(formData.country))}
            onError={setError}
          />
        </>
      )}
    </div>
  )
}
