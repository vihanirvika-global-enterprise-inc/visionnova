import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { ProductCard } from './ProductCard'
import type { Product } from '@/types'

const mockProduct: Product = {
  id: 'prod-001',
  name: 'Classic Frame',
  description: 'Timeless design',
  price: 89.99,
  category: 'frames',
  sku: 'CF-001',
  stockQuantity: 10,
  imageUrl: null,
  requiresPrescription: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ProductCard', () => {
  it('renders the product name and price', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText('$89.99')).toBeInTheDocument()
  })

  it('shows a prescription badge when requiresPrescription is true', () => {
    render(<ProductCard product={{ ...mockProduct, requiresPrescription: true }} />)
    expect(screen.getByText('Requires Prescription')).toBeInTheDocument()
  })

  it('does not show a prescription badge when requiresPrescription is false', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.queryByText('Requires Prescription')).not.toBeInTheDocument()
  })

  it('calls onAddToCart with the product when the button is clicked', async () => {
    const handleAddToCart = vi.fn()
    render(<ProductCard product={mockProduct} onAddToCart={handleAddToCart} />)
    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(handleAddToCart).toHaveBeenCalledWith(mockProduct)
  })
})
