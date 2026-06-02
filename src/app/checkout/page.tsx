'use client'

import { useState, useTransition } from 'react'
import { useCart } from '@/components/cart/CartContext'
import { checkoutAction } from './actions'

export default function CheckoutPage() {
  const { items, total } = useCart()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
    <main>
      <form onSubmit={handleSubmit}>
        {error && <p role="alert">{error}</p>}

        <label htmlFor="line1">Street Address</label>
        <input id="line1" type="text" name="line1" />

        <label htmlFor="city">City</label>
        <input id="city" type="text" name="city" />

        <label htmlFor="postalCode">Postal Code</label>
        <input id="postalCode" type="text" name="postalCode" />

        <label htmlFor="state">State</label>
        <input id="state" type="text" name="state" />

        <label htmlFor="country">Country</label>
        <input id="country" type="text" name="country" defaultValue="US" />

        <p>Total: ${total.toFixed(2)}</p>
        <button type="submit" disabled={isPending}>Place Order</button>
      </form>
    </main>
  )
}
