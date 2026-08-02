import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/cart/CartContext', () => ({
  useCart: vi.fn(),
}))

import { useCart } from '@/components/cart/CartContext'
import OrderSummary from './OrderSummary'

// Minimal cart item factory — only needs the fields the component reads
function makeItem(id: string, name: string, price: number, quantity: number) {
  return { product: { id, name, price }, quantity }
}

function setupCart(items: ReturnType<typeof makeItem>[]) {
  vi.mocked(useCart).mockReturnValue({
    items: items as any,
    total: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OrderSummary', () => {
  it('empty cart shows empty state and free shipping', () => {
    setupCart([])
    render(<OrderSummary />)

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
    // subtotal row + total row both show ₹0 when cart is empty
    expect(screen.getAllByText('₹0')).toHaveLength(2)
  })

  it('single item — name, price, singular "item"', () => {
    setupCart([makeItem('1', 'Classic Frame', 999, 1)])
    render(<OrderSummary />)

    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    // ₹999 appears in: item row, subtotal row, total row
    expect(screen.getAllByText('₹999').length).toBeGreaterThan(0)
    expect(screen.getByText(/subtotal \(1 item\)/i)).toBeInTheDocument()
  })

  it('multiple items — subtotal maths + plural "items"', () => {
    // subtotal: 999*1 + 1499*2 = 3997
    setupCart([
      makeItem('1', 'Frame A', 999, 1),
      makeItem('2', 'Frame B', 1499, 2),
    ])
    render(<OrderSummary />)

    expect(screen.getByText(/subtotal \(3 items\)/i)).toBeInTheDocument()
    // ₹3,997 appears in subtotal row and total row (free shipping = same value)
    expect(screen.getAllByText('₹3,997')).toHaveLength(2)
  })

  it('shipping always shows "Free" regardless of cart state', () => {
    setupCart([])
    const { unmount } = render(<OrderSummary />)
    expect(screen.getByText('Free')).toBeInTheDocument()
    unmount()

    setupCart([makeItem('1', 'Classic Frame', 999, 1)])
    render(<OrderSummary />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('formatters integration — en-IN comma placement for large price', () => {
    setupCart([makeItem('1', 'Premium Frame', 12500, 1)])
    render(<OrderSummary />)

    // Verifies Intl.NumberFormat('en-IN') produces ₹12,500 not ₹12500
    expect(screen.getAllByText('₹12,500').length).toBeGreaterThan(0)
  })
})
