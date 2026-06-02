import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CartProvider, useCart } from './CartContext'
import type { Product } from '@/types'

const mockProduct: Product = {
  id: 'prod-001', name: 'Classic Frame', description: null,
  price: 89.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('useCart', () => {
  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    })
    expect(result.current.items).toEqual([])
  })

  it('adds a product to the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

    act(() => result.current.addToCart(mockProduct))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].product.id).toBe('prod-001')
    expect(result.current.items[0].quantity).toBe(1)
  })

  it('increments quantity when the same product is added twice', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

    act(() => result.current.addToCart(mockProduct))
    act(() => result.current.addToCart(mockProduct))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(2)
  })

  it('removes a product from the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

    act(() => result.current.addToCart(mockProduct))
    act(() => result.current.removeFromCart('prod-001'))

    expect(result.current.items).toHaveLength(0)
  })

  it('calculates the total price of all items', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

    act(() => result.current.addToCart(mockProduct))
    act(() => result.current.addToCart(mockProduct))

    expect(result.current.total).toBe(179.98)
  })
})
