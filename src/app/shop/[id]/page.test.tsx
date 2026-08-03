import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { formatPrice } from '@/lib/formatters'

vi.mock('@/lib/products', () => ({ getProductById: vi.fn() }))
vi.mock('@/lib/productImages', () => ({ getProductImages: vi.fn() }))

describe('ProductPage', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValue([])
  })

  it('renders the product name and price', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: 'prod-001', name: 'Classic Frame', description: 'Timeless design',
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const { CartProvider } = await import('@/components/cart/CartContext')
    const ProductPage = (await import('./page')).default
    render(<CartProvider>{await ProductPage({ params: { id: 'prod-001' } })}</CartProvider>)

    expect(screen.getByText('Classic Frame')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(89.99))).toBeInTheDocument()
  })

  it('shows a not found message when the product does not exist', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce(null)

    const { CartProvider } = await import('@/components/cart/CartContext')
    const ProductPage = (await import('./page')).default
    render(<CartProvider>{await ProductPage({ params: { id: 'nonexistent' } })}</CartProvider>)

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

    const { CartProvider } = await import('@/components/cart/CartContext')
    const ProductPage = (await import('./page')).default
    render(<CartProvider>{await ProductPage({ params: { id: 'prod-001' } })}</CartProvider>)

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

    const { CartProvider } = await import('@/components/cart/CartContext')
    const ProductPage = (await import('./page')).default
    render(<CartProvider>{await ProductPage({ params: { id: 'prod-001' } })}</CartProvider>)

    expect(screen.queryByTestId('product-description')).not.toBeInTheDocument()
  })

  it('shows out of stock message when product has no stock', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: 'prod-001', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 0, imageUrl: null, requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const { CartProvider } = await import('@/components/cart/CartContext')
    const ProductPage = (await import('./page')).default
    render(<CartProvider>{await ProductPage({ params: { id: 'prod-001' } })}</CartProvider>)

    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
  })
})

describe('ProductPage — image gallery', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValue({
      id: 'prod-001', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: 'https://cdn.example/legacy.jpg', requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })
  })

  it('renders every real product_images row, in order, with real alt text', async () => {
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValueOnce([
      { id: 'img-1', productId: 'prod-001', url: 'https://cdn.example/1.jpg', alt: 'Front view', sortOrder: 0, createdAt: new Date() },
      { id: 'img-2', productId: 'prod-001', url: 'https://cdn.example/2.jpg', alt: 'Side view', sortOrder: 1, createdAt: new Date() },
      { id: 'img-3', productId: 'prod-001', url: 'https://cdn.example/3.jpg', alt: 'Case included', sortOrder: 2, createdAt: new Date() },
    ])

    const { CartProvider } = await import('@/components/cart/CartContext')
    const ProductPage = (await import('./page')).default
    render(<CartProvider>{await ProductPage({ params: { id: 'prod-001' } })}</CartProvider>)

    const thumbnails = screen.getAllByRole('tab')
    expect(thumbnails).toHaveLength(3)
    expect(thumbnails[0]).toHaveAccessibleName(/1 of 3/)
    expect(thumbnails[1]).toHaveAccessibleName(/2 of 3/)
    expect(thumbnails[2]).toHaveAccessibleName(/3 of 3/)
    expect(screen.getAllByAltText('Front view').length).toBeGreaterThan(0)
  })

  it('does not crash and falls back gracefully when a product has zero product_images rows', async () => {
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValueOnce([])

    const { CartProvider } = await import('@/components/cart/CartContext')
    const ProductPage = (await import('./page')).default
    render(<CartProvider>{await ProductPage({ params: { id: 'prod-001' } })}</CartProvider>)

    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.getByAltText('Classic Frame')).toHaveAttribute(
      'src', expect.stringContaining('legacy.jpg')
    )
  })
})
