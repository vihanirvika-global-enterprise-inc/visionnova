'use client'

import { useState, useTransition } from 'react'
import { useCart } from '@/components/cart/CartContext'
import { checkoutAction } from './actions'

export default function CheckoutPage() {
  const { items, total } = useCart()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('cart', JSON.stringify(
      items.map((i) => ({ product: { id: i.product.id, price: i.product.price }, quantity: i.quantity }))
    ))
    setError(null)
    startTransition(async () => {
      const result = await checkoutAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-dark">Checkout</h1>

      <div className="grid gap-8 md:grid-cols-3">

        {/* ── Shipping form ────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="md:col-span-2">

          {error && (
            <p role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <p className="mb-4 text-lg font-semibold text-dark">Shipping Address</p>

          {/* Full Name */}
          <div className="mb-4">
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-dark">
              Full Name
            </label>
            <input id="fullName" type="text" name="fullName" className="input-field" />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label htmlFor="checkoutEmail" className="mb-1 block text-sm font-medium text-dark">
              Email
            </label>
            <input id="checkoutEmail" type="email" name="email" className="input-field" />
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-dark">
              Phone
            </label>
            <input id="phone" type="tel" name="phone" className="input-field" />
          </div>

          {/* Street Address — label text kept for test: getByLabelText(/street address/i) */}
          <div className="mb-4">
            <label htmlFor="line1" className="mb-1 block text-sm font-medium text-dark">
              Street Address
            </label>
            <input id="line1" type="text" name="line1" className="input-field" />
          </div>

          {/* Address Line 2 */}
          <div className="mb-4">
            <label htmlFor="line2" className="mb-1 block text-sm font-medium text-dark">
              Address Line 2 <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="line2" type="text" name="line2" className="input-field" />
          </div>

          {/* City + State */}
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className="mb-1 block text-sm font-medium text-dark">
                City
              </label>
              <input id="city" type="text" name="city" className="input-field" />
            </div>
            <div>
              {/* label text exactly "State" — anchored regex /^state$/i in test */}
              <label htmlFor="state" className="mb-1 block text-sm font-medium text-dark">
                State
              </label>
              <input id="state" type="text" name="state" className="input-field" />
            </div>
          </div>

          {/* PIN Code + Country */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="postalCode" className="mb-1 block text-sm font-medium text-dark">
                Postal Code
              </label>
              <input id="postalCode" type="text" name="postalCode" className="input-field" />
            </div>
            <div>
              {/* label text exactly "Country" — anchored regex /^country$/i in test */}
              <label htmlFor="country" className="mb-1 block text-sm font-medium text-dark">
                Country
              </label>
              <input id="country" type="text" name="country" defaultValue="US" className="input-field" />
            </div>
          </div>

          {/* Payment notice — overrides .card border/bg with amber tokens */}
          <div className="card mb-6 border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="text-sm text-amber-800">
                Payment is processed securely. You will be redirected to our payment provider after placing your order.
              </p>
            </div>
          </div>

          {/* py-3 text-lg override btn-primary defaults (utilities beat @layer components) */}
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full py-3 text-lg"
          >
            Place Order
          </button>

        </form>

        {/* ── Order summary sidebar ────────────────────────── */}
        <div className="md:col-span-1">
          <div className="card sticky top-24 p-6">
            <p className="mb-4 font-semibold text-dark">Order Summary</p>

            {items.length === 0 ? (
              <p className="text-sm text-muted">Your cart is empty</p>
            ) : (
              <>
                <div className="mb-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-start justify-between gap-2 text-sm">
                      <span className="truncate text-dark">{item.product.name}</span>
                      <span className="flex-shrink-0 text-muted">${item.product.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <hr className="my-3 border-slate-100" />

                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                  <span>${total.toFixed(2)}</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>

                <hr className="my-3 border-slate-100" />

                {/* single text node — getByText('Total: $X') requires no child elements */}
                <p className="font-bold text-primary">Total: ${total.toFixed(2)}</p>
              </>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
