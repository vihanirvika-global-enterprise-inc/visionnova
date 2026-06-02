import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/products', () => ({ getInStockProducts: vi.fn() }))

describe('CatalogPage', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('renders a ProductCard for each product', async () => {
    const { getInStockProducts } = await import('@/lib/products')
    vi.mocked(getInStockProducts).mockResolvedValueOnce([
      {
        id: 'prod-001', name: 'Classic Frame', description: null,
        price: 89.99, category: 'frames' as const, sku: 'CF-001',
        stockQuantity: 10, imageUrl: null, requiresPrescription: false,
        createdAt: new Date(), updatedAt: new Date(),
      },
    ])

    const { CartProvider } = await import('@/components/cart/CartContext')
    const CatalogPage = (await import('./page')).default
    render(<CartProvider>{await CatalogPage()}</CartProvider>)

    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText('$89.99')).toBeInTheDocument()
  })

  it('shows an empty state when there are no products', async () => {
    const { getInStockProducts } = await import('@/lib/products')
    vi.mocked(getInStockProducts).mockResolvedValueOnce([])

    const { CartProvider } = await import('@/components/cart/CartContext')
    const CatalogPage = (await import('./page')).default
    render(<CartProvider>{await CatalogPage()}</CartProvider>)

    expect(screen.getByText('No products available')).toBeInTheDocument()
  })
})
