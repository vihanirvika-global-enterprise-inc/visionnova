'use client'

import { createContext, useContext, useState } from 'react'
import type { Product } from '@/types'

interface CartItem {
  product: Product
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  total: number
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  // The code the customer said they want to apply — just the raw string, so
  // it survives client-side navigation from /cart to /checkout. It is never
  // trusted as "this coupon is valid": checkoutAction re-validates and
  // recomputes the discount server-side regardless of what's stored here.
  couponCode: string | null
  setCouponCode: (code: string | null) => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [couponCode, setCouponCode] = useState<string | null>(null)

  function addToCart(product: Product) {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function removeFromCart(productId: string) {
    setItems((prev) => prev.filter((item) => item.product.id !== productId))
  }

  // No live stock check here — the cart is pure in-memory state with no
  // server sync, so product.stockQuantity is only the snapshot from whenever
  // the item was added. It's a soft cap against an arbitrary quantity, not a
  // real-time availability guarantee.
  function updateQuantity(productId: string, quantity: number) {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === productId)
      if (!existing) return prev

      if (quantity <= 0) {
        return prev.filter((item) => item.product.id !== productId)
      }

      const max = Math.max(1, existing.product.stockQuantity)
      const capped = Math.min(quantity, max)

      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: capped } : item
      )
    })
  }

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{ items, total, addToCart, removeFromCart, updateQuantity, couponCode, setCouponCode }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}
