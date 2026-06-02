import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/products', () => ({ getProductById: vi.fn() }))

describe('ProductPage', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('renders the product name and price', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: 'prod-001', name: 'Classic Frame', description: 'Timeless design',
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const ProductPage = (await import('./page')).default
    render(await ProductPage({ params: { id: 'prod-001' } }))

    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText('$89.99')).toBeInTheDocument()
  })

  it('shows a not found message when the product does not exist', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(null)

    const ProductPage = (await import('./page')).default
    render(await ProductPage({ params: { id: 'nonexistent' } }))

    expect(screen.getByText('Product not found')).toBeInTheDocument()
  })

  it('renders the description when present', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: 'prod-001', name: 'Classic Frame', description: 'Timeless design',
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const ProductPage = (await import('./page')).default
    render(await ProductPage({ params: { id: 'prod-001' } }))

    expect(screen.getByText('Timeless design')).toBeInTheDocument()
  })

  it('renders nothing for description when it is null', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: 'prod-001', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const ProductPage = (await import('./page')).default
    render(await ProductPage({ params: { id: 'prod-001' } }))

    expect(screen.queryByTestId('product-description')).not.toBeInTheDocument()
  })
})
