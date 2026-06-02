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
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

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

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return <CartContext.Provider value={{ items, total, addToCart, removeFromCart }}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}
