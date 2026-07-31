'use client'

import { useCart } from '@/components/cart/CartContext'
import { formatPrice } from '@/lib/formatters'

export default function OrderSummary() {
  const { items } = useCart()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const total = subtotal // shipping is free at MVP

  return (
    <div className="card sticky top-24 p-6">
      <p className="mb-4 text-lg font-semibold text-dark">Order Summary</p>

      {items.length === 0 ? (
        <p className="text-sm text-muted">Your cart is empty</p>
      ) : (
        <div className="mb-3 space-y-2">
          {items.map((item) => (
            <div key={item.product.id} className="flex justify-between text-sm mb-2">
              <span className="max-w-[160px] overflow-hidden whitespace-nowrap text-ellipsis text-dark">
                {item.product.name}
              </span>
              <span className="text-primary font-medium">
                {formatPrice(item.product.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      )}

      <hr className="border-slate-100 my-3" />

      <div className="flex justify-between text-sm">
        <span className="text-muted">
          Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </span>
        <span className="text-dark">{formatPrice(subtotal)}</span>
      </div>

      <div className="flex justify-between text-sm mt-1">
        <span className="text-muted">Shipping</span>
        <span className="font-medium text-green-700">Free</span>
      </div>

      <hr className="border-slate-100 my-3" />

      <div className="flex justify-between">
        <span className="font-bold text-dark">Total</span>
        <span className="font-bold text-lg text-primary">{formatPrice(total)}</span>
      </div>
    </div>
  )
}
