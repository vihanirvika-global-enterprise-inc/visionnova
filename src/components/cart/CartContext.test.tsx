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

  describe('updateQuantity', () => {
    it('sets the quantity of an item already in the cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

      act(() => result.current.addToCart(mockProduct))
      act(() => result.current.updateQuantity('prod-001', 5))

      expect(result.current.items[0].quantity).toBe(5)
    })

    it('recalculates the total when quantity changes', () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

      act(() => result.current.addToCart(mockProduct))
      act(() => result.current.updateQuantity('prod-001', 3))

      expect(result.current.total).toBeCloseTo(269.97) // 89.99 * 3
    })

    it('removes the item entirely when quantity is set to 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

      act(() => result.current.addToCart(mockProduct))
      act(() => result.current.updateQuantity('prod-001', 0))

      expect(result.current.items).toHaveLength(0)
    })

    it('removes the item entirely when quantity is set below 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

      act(() => result.current.addToCart(mockProduct))
      act(() => result.current.updateQuantity('prod-001', -1))

      expect(result.current.items).toHaveLength(0)
    })

    // mockProduct.stockQuantity is 10 — the cart has no live stock awareness
    // beyond this snapshot from whenever the item was added, so it's a soft
    // cap, not a real-time check.
    it('caps quantity at the product\'s stockQuantity rather than accepting an arbitrary number', () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

      act(() => result.current.addToCart(mockProduct))
      act(() => result.current.updateQuantity('prod-001', 999))

      expect(result.current.items[0].quantity).toBe(10)
    })

    it('is a no-op for a product not currently in the cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

      act(() => result.current.addToCart(mockProduct))
      act(() => result.current.updateQuantity('some-other-product', 5))

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].product.id).toBe('prod-001')
      expect(result.current.items[0].quantity).toBe(1)
    })
  })

  describe('couponCode', () => {
    it('starts with no coupon applied', () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider })
      expect(result.current.couponCode).toBeNull()
    })

    it('sets the coupon code so it can be threaded through to checkout', () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

      act(() => result.current.setCouponCode('SAVE10'))

      expect(result.current.couponCode).toBe('SAVE10')
    })

    it('clears the coupon code', () => {
      const { result } = renderHook(() => useCart(), { wrapper: CartProvider })

      act(() => result.current.setCouponCode('SAVE10'))
      act(() => result.current.setCouponCode(null))

      expect(result.current.couponCode).toBeNull()
    })
  })
})
