'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'

export default function CartPage() {
  const { items, total, removeFromCart } = useCart()
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-dark">Your Cart</h1>
        <div className="flex flex-col items-center py-16 text-center">
          <svg
            className="h-16 w-16 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <p className="mt-4 text-lg text-muted">Your cart is empty</p>
          <Link href="/shop" className="btn-primary mt-6">
            Browse Eyewear
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-dark">Your Cart</h1>

      <div className="grid gap-8 md:grid-cols-3">

        {/* ── Line items ───────────────────────────────────── */}
        <div className="space-y-3 md:col-span-2">
          {items.map((item) => (
            <div key={item.product.id} className="card p-4">
              <div className="flex gap-4">

                {/* Thumbnail */}
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {item.product.imageUrl ? (
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-cyan-400">
                      <svg
                        className="h-8 w-8 text-white opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col gap-1">
                  {/* name × qty kept as one text node — required by tests */}
                  <p className="font-semibold text-dark">
                    {item.product.name} × {item.quantity}
                  </p>
                  <p className="font-bold text-primary">
                    ${item.product.price.toFixed(2)}
                  </p>
                  {item.product.requiresPrescription && (
                    <span className="w-fit rounded-full bg-gold px-2 py-0.5 text-xs text-white">
                      Requires Prescription
                    </span>
                  )}
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="mt-1 w-fit text-sm text-red-500 transition-colors hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* ── Order summary ────────────────────────────────── */}
        <div className="md:col-span-1">
          <div className="card sticky top-24 p-6">
            <p className="mb-4 font-semibold text-dark">Order Summary</p>

            <div className="flex items-center justify-between text-sm text-muted">
              <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <hr className="my-3 border-slate-100" />

            <div className="flex items-center justify-between text-sm text-muted">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>

            <hr className="my-3 border-slate-100" />

            {/* single text node — getByText('Total: $X') requires no child elements */}
            <p className="font-bold text-primary">
              Total: ${total.toFixed(2)}
            </p>

            <Link href="/checkout" className="btn-primary mt-6 w-full">
              Proceed to Checkout
            </Link>
            <Link href="/shop" className="btn-secondary mt-2 w-full">
              Continue Shopping
            </Link>
          </div>
        </div>

      </div>
    </main>
  )
}
