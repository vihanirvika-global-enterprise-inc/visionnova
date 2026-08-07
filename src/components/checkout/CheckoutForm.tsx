'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getClientStripe } from '@/lib/stripe'
import { createPayment } from '@/app/checkout/payment-actions'
import { checkoutAction } from '@/app/checkout/actions'
import { SERVICEABLE_COUNTRIES } from '@/lib/serviceableRegions'
import { INDIAN_STATES, isValidPinCode } from '@/lib/indiaAddress'
import { lookupPincode } from '@/lib/pincodeLookup'
import { validateShippingAddress, type ShippingAddressInput } from '@/lib/shippingAddress'
import type { FieldErrors } from '@/lib/validationResult'
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

// ── Field wrapper ─────────────────────────────────────────────────────────────

// Mirrors AuthField's contract (aria-invalid + aria-describedby pointing at
// the message) so the two forms cannot drift apart on how an invalid field is
// announced. Kept local rather than reusing AuthField itself: this one has to
// wrap a <select> as well as an <input>, and carries no password affordances.
function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <ul id={id} className="mt-1 space-y-0.5 text-xs text-red-700">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  )
}

// The wiring every field needs, in one place, so no field can be given
// aria-invalid without also being given something to describe it with.
// extraIds covers a field that has something else to say as well (the PIN's
// lookup status) — an aria-describedby naming a missing id is announced as
// nothing at all by some screen readers, so absent ids are filtered out
// rather than concatenated blindly.
function fieldAria(id: string, messages?: string[], ...extraIds: (string | undefined)[]) {
  const hasError = !!messages?.length
  const describedBy = [...extraIds, hasError ? `${id}-error` : undefined]
    .filter(Boolean)
    .join(' ')

  return {
    'aria-invalid': hasError || undefined,
    'aria-describedby': describedBy || undefined,
  } as const
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

// What the PIN lookup is currently telling the customer. 'idle' covers both
// "nothing typed yet" and "not a complete PIN", which need no message at all.
type PinLookupState = 'idle' | 'looking-up' | 'filled' | 'not-found' | 'unavailable'

const PIN_LOOKUP_MESSAGES: Partial<Record<PinLookupState, string>> = {
  'looking-up': 'Looking up PIN code…',
  // Neither failure names a cause the customer can act on, and neither is a
  // reason they cannot continue — so both say the same thing: type it yourself.
  'not-found': 'We could not find that PIN code. Enter City and State manually.',
  unavailable: 'PIN code lookup is unavailable right now. Enter City and State manually.',
}

interface AddressFormProps {
  formData: AddressFormData
  onChange: (e: AddressFieldChangeEvent) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  error: string | null
  requiresPrescriptionUpload?: boolean
  pinLookupState: PinLookupState
  districtOptions: string[]
  onDistrictSelect: (district: string) => void
  fieldErrors: FieldErrors
}

function AddressForm({
  formData, onChange, onSubmit, isLoading, error, requiresPrescriptionUpload,
  pinLookupState, districtOptions, onDistrictSelect, fieldErrors,
}: AddressFormProps) {
  const pinLookupMessage = PIN_LOOKUP_MESSAGES[pinLookupState]

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
          autoComplete="name"
          value={formData.fullName} onChange={onChange} className="input-field"
          {...fieldAria('fullName', fieldErrors.fullName)}
        />
          <FieldError id="fullName-error" messages={fieldErrors.fullName} />
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-dark">
          Email
        </label>
        <input
          id="email" name="email" type="email" required
          value={formData.email} onChange={onChange} className="input-field"
          {...fieldAria('email', fieldErrors.email)}
        />
          <FieldError id="email-error" messages={fieldErrors.email} />
      </div>

      <div className="mb-4">
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-dark">
          Phone
        </label>
        {/* inputMode "tel" rather than "numeric": the validator accepts a +91
            prefix, and the iOS numeric keypad has no "+" key — "numeric"
            would make a documented-valid input impossible to type. maxLength
            fits '+91 98765 43210' and stops a pasted address from silently
            filling the field. */}
        <input
          id="phone" name="phone" type="tel" required
          inputMode="tel" maxLength={15} autoComplete="tel"
          value={formData.phone} onChange={onChange} className="input-field"
          {...fieldAria('phone', fieldErrors.phone)}
        />
          <FieldError id="phone-error" messages={fieldErrors.phone} />
      </div>

      <div className="mb-4">
        <label htmlFor="addressLine1" className="mb-1 block text-sm font-medium text-dark">
          Address Line 1
        </label>
        <input
          id="addressLine1" name="addressLine1" type="text" required
          value={formData.addressLine1} onChange={onChange} className="input-field"
          {...fieldAria('addressLine1', fieldErrors.addressLine1)}
        />
          <FieldError id="addressLine1-error" messages={fieldErrors.addressLine1} />
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
            {...fieldAria('city', fieldErrors.city)}
          />
            <FieldError id="city-error" messages={fieldErrors.city} />
        </div>
        <div>
          <label htmlFor="state" className="mb-1 block text-sm font-medium text-dark">
            State
          </label>
          {/* A dropdown, not free text: a typed state reached the order record
              as "andhrapradesh", which no downstream consumer can match against
              the canonical list. No default is selected — pre-selecting one
              would silently ship orders to whichever state sorts first. */}
          <select
            id="state" name="state" required
            value={formData.state} onChange={onChange} className="input-field"
            {...fieldAria('state', fieldErrors.state)}
          >
            <option value="">Select a state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
            <FieldError id="state-error" messages={fieldErrors.state} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="pinCode" className="mb-1 block text-sm font-medium text-dark">
            PIN Code
          </label>
          {/* inputMode brings up the numeric keypad on mobile; maxLength stops
              a pasted phone number from silently overflowing the field. type
              stays "text" so leading zeros and paste behave predictably —
              type="number" would strip them and add spinners. */}
          {/* This field can have two things to describe it at once — the
              lookup status and a validation error — so the ids are composed
              rather than one overwriting the other. */}
          <input
            id="pinCode" name="pinCode" type="text"
            inputMode="numeric" maxLength={6} autoComplete="postal-code"
            value={formData.pinCode} onChange={onChange} className="input-field"
            {...fieldAria('pinCode', fieldErrors.pinCode, pinLookupMessage ? 'pin-lookup-status' : undefined)}
          />
          <FieldError id="pinCode-error" messages={fieldErrors.pinCode} />
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

      {/* role="status", never role="alert": a lookup outcome is a convenience
          that did or did not land, not an error the customer must resolve.
          Announcing it assertively would interrupt them over something they
          can simply type instead. */}
      {pinLookupMessage && (
        <p id="pin-lookup-status" role="status" className="mb-4 -mt-2 text-sm text-muted">
          {pinLookupMessage}
        </p>
      )}

      {/* A PIN that straddles districts has no single right answer, so the
          choice is offered rather than guessed — the wrong city on a parcel is
          worse than one extra tap. */}
      {districtOptions.length > 0 && (
        <div role="group" aria-labelledby="district-choice-label" className="mb-4 -mt-2">
          <p id="district-choice-label" className="mb-2 text-sm text-muted">
            This PIN code covers more than one district. Which is yours?
          </p>
          <div className="flex flex-wrap gap-2">
            {districtOptions.map((district) => (
              <button
                key={district}
                type="button"
                onClick={() => onDistrictSelect(district)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-dark hover:border-primary hover:text-primary"
              >
                {district}
              </button>
            ))}
          </div>
        </div>
      )}

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

const CHECKOUT_STEPS_STANDARD = [
  { key: 'address', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
] as const

// ST-010 (A10. Checkout — "3-step"): the epic specifies address / Rx-confirm
// / payment. The Rx-confirm step only exists when the order actually
// contains an Rx-required item — checkoutAction returns prescriptionId only
// in that case, so the step list itself is derived from that, not static.
const CHECKOUT_STEPS_WITH_RX_CONFIRM = [
  { key: 'address', label: 'Shipping' },
  { key: 'confirm-rx', label: 'Confirm Prescription' },
  { key: 'payment', label: 'Payment' },
] as const

// Long enough that typing six digits is one request, short enough that the
// fill feels like it happened as you finished typing.
const PIN_LOOKUP_DEBOUNCE_MS = 400

// The form's field names and the address contract's field names differ
// (addressLine1/line1, pinCode/postalCode). Both mappings live here, next to
// each other, so a rename on either side has one place to be fixed rather
// than silently landing an error on a field that will never render it.
const FIELD_NAME_BY_ADDRESS_KEY: Record<string, string> = {
  line1: 'addressLine1',
  line2: 'addressLine2',
  postalCode: 'pinCode',
}

function toShippingAddress(formData: AddressFormData): ShippingAddressInput {
  return {
    fullName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    line1: formData.addressLine1,
    line2: formData.addressLine2,
    city: formData.city,
    state: formData.state,
    postalCode: formData.pinCode,
    country: formData.country,
  }
}

function toFormFieldErrors(errors: FieldErrors): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([key, messages]) => [
      FIELD_NAME_BY_ADDRESS_KEY[key] ?? key,
      messages,
    ])
  )
}

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
  // Set once, when checkoutAction's result includes a prescriptionId — stays
  // true for the rest of the flow even after the confirm-rx step is passed,
  // since it also drives which step list is rendered in the progress bar.
  const [needsRxConfirm, setNeedsRxConfirm] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; totalAmount: number } | null>(null)
  const [pinLookupState, setPinLookupState] = useState<PinLookupState>('idle')
  // Non-empty only when a PIN genuinely spans districts and the customer has
  // not yet chosen; the single-district case fills City directly instead.
  const [districtOptions, setDistrictOptions] = useState<string[]>([])
  // Keyed by the form's own field names, not the address contract's — see
  // toFormFieldErrors.
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const paymentRegionRef = useRef<HTMLDivElement>(null)
  const confirmRxRegionRef = useRef<HTMLDivElement>(null)

  // The address form (or confirm-rx step) unmounts on transition, destroying
  // the focused button and dropping focus to <body> — a keyboard user is
  // silently returned to the top of the page. Move focus into the new region.
  useEffect(() => {
    if (step === 'payment') paymentRegionRef.current?.focus()
    if (step === 'confirm-rx') confirmRxRegionRef.current?.focus()
  }, [step])

  function handleChange(e: AddressFieldChangeEvent) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Client-side only, and deliberately nowhere near the submit path: this is a
  // convenience while typing, so India Post being slow or unreachable must
  // cost the customer nothing but the autofill itself.
  useEffect(() => {
    const pinCode = formData.pinCode

    if (!isValidPinCode(pinCode)) {
      setPinLookupState('idle')
      setDistrictOptions([])
      return
    }

    setPinLookupState('looking-up')

    // The PIN can change while a request is in flight. The cleanup below flips
    // this so a superseded response never writes a city for a PIN the customer
    // has already moved on from.
    let cancelled = false

    // Debounced so typing six digits costs one request, not six.
    const timer = setTimeout(async () => {
      const result = await lookupPincode(pinCode)
      if (cancelled) return

      if (result.status !== 'found') {
        setDistrictOptions([])
        setPinLookupState(result.status)
        return
      }

      // State is unambiguous even when the district is not, so it is filled
      // either way. City is only filled when there is exactly one candidate.
      const [onlyDistrict] = result.districts
      setDistrictOptions(result.districts.length > 1 ? result.districts : [])
      setFormData((prev) => ({
        ...prev,
        city: result.districts.length === 1 ? onlyDistrict : prev.city,
        state: result.state ?? prev.state,
      }))
      setPinLookupState('filled')
    }, PIN_LOOKUP_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [formData.pinCode])

  function handleDistrictSelect(district: string) {
    setFormData((prev) => ({ ...prev, city: district }))
    setDistrictOptions([])
  }

  // The order must exist before the payment intent so its id can be carried in
  // the intent metadata — that is what the webhook uses to mark the order paid.
  function buildOrderFormData(): FormData {
    const fd = new FormData()
    // Every field the form collects goes on the wire. fullName, email, phone
    // and addressLine2 were previously gathered and then dropped here, so an
    // order was created with no name and no number for the courier to call —
    // and the Phone field accepted anything, because nothing downstream ever
    // read it.
    fd.append('fullName', formData.fullName)
    fd.append('email', formData.email)
    fd.append('phone', formData.phone)
    fd.append('line1', formData.addressLine1)
    fd.append('line2', formData.addressLine2)
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

  // Shared by the direct (no Rx item) path and the post-confirm-rx path —
  // the server decides the gateway from the shipping country, so the routing
  // rule is not duplicated in the browser. totalAmount here is always the
  // server-computed one from checkoutAction, never the client cart's own
  // total, so a stale or tampered client total never reaches the gateway.
  async function initiatePayment(orderId: string, totalAmount: number) {
    const result = await createPayment(
      formatAmountForStripe(totalAmount),
      orderId,
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
    trackEvent({ event: 'checkout_started', total: totalAmount, itemCount: items.length })
  }

  async function handleAddressSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // The same rules the server runs, run here first — so a mistyped phone is
    // pointed at the phone field immediately instead of coming back as one
    // generic error card after a round trip. checkoutAction still re-validates:
    // this is for the customer's benefit, never a substitute for the server
    // check, which is the only one an attacker cannot skip.
    const { valid, fieldErrors: errors } = validateShippingAddress(toShippingAddress(formData))
    if (!valid) {
      setFieldErrors(toFormFieldErrors(errors))
      setError(null)
      return
    }

    setFieldErrors({})
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

    if (orderResult.prescriptionId) {
      setNeedsRxConfirm(true)
      setPendingOrder({ orderId: orderResult.orderId, totalAmount: orderResult.totalAmount })
      setStep('confirm-rx')
      setIsLoading(false)
      return
    }

    await initiatePayment(orderResult.orderId, orderResult.totalAmount)
  }

  async function handleConfirmRxContinue() {
    if (!pendingOrder) return
    setIsLoading(true)
    await initiatePayment(pendingOrder.orderId, pendingOrder.totalAmount)
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-dark">Shipping &amp; Payment</h2>

      {/* A real list with aria-current, matching OrderStatusTimeline. Previously
          the current step was conveyed by font weight and colour alone. */}
      <ol aria-label="Checkout progress" className="mb-8 flex items-center gap-2">
        {(needsRxConfirm ? CHECKOUT_STEPS_WITH_RX_CONFIRM : CHECKOUT_STEPS_STANDARD).map((checkoutStep, index) => {
          const isCurrent = checkoutStep.key === step
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
          pinLookupState={pinLookupState}
          districtOptions={districtOptions}
          onDistrictSelect={handleDistrictSelect}
          fieldErrors={fieldErrors}
        />
      )}

      {step === 'confirm-rx' && (
        <div
          ref={confirmRxRegionRef}
          tabIndex={-1}
          role="group"
          aria-labelledby="confirm-rx-heading"
        >
          <h3 id="confirm-rx-heading" className="mb-4 text-base font-semibold text-dark">
            Confirm Prescription
          </h3>
          <p className="mb-6 text-sm text-muted">
            Your approved prescription on file will be used to fulfill the
            prescription item(s) in this order.
          </p>

          {isLoading ? (
            <p role="status" className="sr-only">
              Processing, please wait
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleConfirmRxContinue}
            disabled={isLoading}
            aria-busy={isLoading}
            className="btn-primary w-full py-3 text-lg"
          >
            {isLoading ? 'Please wait...' : 'Continue to Payment'}
          </button>
        </div>
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
