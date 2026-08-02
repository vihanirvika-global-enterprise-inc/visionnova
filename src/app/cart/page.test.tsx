import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CartProvider, useCart } from '@/components/cart/CartContext'
import * as CartActions from './actions'
import CartPage from './page'
import type { Product } from '@/types'

vi.mock('./actions', () => ({ applyCouponAction: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
})

const mockProduct: Product = {
  id: 'prod-001', name: 'Classic Frame', description: null,
  price: 89.99, category: 'frames', sku: 'CF-001',
  stockQuantity: 10, imageUrl: null, requiresPrescription: false,
  createdAt: new Date(), updatedAt: new Date(),
}

function renderCartWithProduct(product: Product = mockProduct) {
  let addToCart: (p: Product) => void

  function Harness() {
    addToCart = useCart().addToCart
    return <CartPage />
  }

  const utils = render(<CartProvider><Harness /></CartProvider>)
  act(() => addToCart(product))
  return utils
}

describe('CartPage', () => {
  it('shows an empty state when the cart has no items', () => {
    render(
      <CartProvider>
        <CartPage />
      </CartProvider>
    )
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })

  it('renders cart items and the order total', () => {
    renderCartWithProduct()

    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText('Total: $89.99')).toBeInTheDocument()
  })

  it('renders a proceed to checkout link when cart has items', () => {
    renderCartWithProduct()

    const link = screen.getByRole('link', { name: /proceed to checkout/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/checkout')
  })

  it('removes an item when the remove button is clicked', async () => {
    renderCartWithProduct()
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })

  describe('quantity stepper', () => {
    it('increments the quantity and the order total', async () => {
      renderCartWithProduct()

      await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))

      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Total: $179.98')).toBeInTheDocument()
    })

    it('decrements the quantity and the order total', async () => {
      renderCartWithProduct({ ...mockProduct, stockQuantity: 10 })
      await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))
      await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))
      // now at 3

      await userEvent.click(screen.getByRole('button', { name: /decrease quantity/i }))

      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Total: $179.98')).toBeInTheDocument()
    })

    it('removes the item and shows the empty-cart state when decremented to 0', async () => {
      renderCartWithProduct()

      await userEvent.click(screen.getByRole('button', { name: /decrease quantity/i }))

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    })

    it('does not increment past the product\'s stock on file', async () => {
      renderCartWithProduct({ ...mockProduct, stockQuantity: 1 })

      await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }))

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('Total: $89.99')).toBeInTheDocument()
    })
  })

  describe('coupon code', () => {
    it('shows the discount and adjusted total when a valid code is applied', async () => {
      vi.mocked(CartActions.applyCouponAction).mockResolvedValue({
        valid: true,
        coupon: {
          id: 'coupon-1', code: 'SAVE10', type: 'percent', value: 10,
          validFrom: new Date(), validTo: new Date(),
          maxUses: 100, currentUses: 5, createdAt: new Date(),
        },
        discount: 9,
      })
      renderCartWithProduct()

      await userEvent.type(screen.getByLabelText(/coupon code/i), 'SAVE10')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => expect(CartActions.applyCouponAction).toHaveBeenCalledWith('SAVE10', 89.99))
      expect(screen.getByText(/-\$9\.00/)).toBeInTheDocument()
      expect(screen.getByText('Total: $80.99')).toBeInTheDocument()
    })

    it('shows the specific rejection reason for an invalid code, not a generic error', async () => {
      vi.mocked(CartActions.applyCouponAction).mockResolvedValue({
        valid: false,
        reason: 'expired',
      })
      renderCartWithProduct()

      await userEvent.type(screen.getByLabelText(/coupon code/i), 'OLDCODE')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => expect(screen.getByText(/expired/i)).toBeInTheDocument())
      expect(screen.getByText('Total: $89.99')).toBeInTheDocument()
    })

    it('does not call applyCouponAction for an empty code', async () => {
      renderCartWithProduct()

      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      expect(CartActions.applyCouponAction).not.toHaveBeenCalled()
    })
  })
})
