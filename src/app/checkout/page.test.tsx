import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Prevent the actions → orders → db → DATABASE_URL chain from executing
vi.mock('./actions', () => ({ checkoutAction: vi.fn() }))

vi.mock('@/components/checkout/CheckoutForm', () => ({
  default: () => <div data-testid="checkout-form">CheckoutForm</div>,
}))

vi.mock('@/components/checkout/OrderSummary', () => ({
  default: () => <div data-testid="order-summary">OrderSummary</div>,
}))

import CheckoutPage from './page'

describe('CheckoutPage', () => {
  it('renders page heading "Checkout"', () => {
    render(<CheckoutPage />)
    expect(screen.getByRole('heading', { name: /checkout/i })).toBeInTheDocument()
  })

  it('renders CheckoutForm component', () => {
    render(<CheckoutPage />)
    expect(screen.getByTestId('checkout-form')).toBeInTheDocument()
  })

  it('renders OrderSummary component', () => {
    render(<CheckoutPage />)
    expect(screen.getByTestId('order-summary')).toBeInTheDocument()
  })

  it('renders checkout layout grid wrapper', () => {
    render(<CheckoutPage />)
    expect(screen.getByTestId('checkout-layout')).toBeInTheDocument()
  })
})
