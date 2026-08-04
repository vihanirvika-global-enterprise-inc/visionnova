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

describe('ProductPage — lens builder', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValue([])
  })

  it('shows the lens builder for a prescription-required product', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: 'prod-002', name: 'Rx Frame', description: null,
      price: 129.99, category: 'frames' as const, sku: 'RX-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: true,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const { CartProvider } = await import('@/components/cart/CartContext')
    const ProductPage = (await import('./page')).default
    render(<CartProvider>{await ProductPage({ params: { id: 'prod-002' } })}</CartProvider>)

    expect(screen.getByText('Build Your Lenses')).toBeInTheDocument()
    expect(screen.getByLabelText(/lens type/i)).toBeInTheDocument()
  })

  it('does not show the lens builder for a non-prescription product', async () => {
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

    expect(screen.queryByText('Build Your Lenses')).not.toBeInTheDocument()
  })
})

describe('ProductPage — try-on preview', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValue([])
  })

  it('shows the try-on upload prompt when the product has an image', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: 'prod-001', name: 'Classic Frame', description: null,
      price: 89.99, category: 'frames' as const, sku: 'CF-001',
      stockQuantity: 10, imageUrl: 'https://cdn.example/frame.png', requiresPrescription: false,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const { CartProvider } = await import('@/components/cart/CartContext')
    const ProductPage = (await import('./page')).default
    render(<CartProvider>{await ProductPage({ params: { id: 'prod-001' } })}</CartProvider>)

    expect(screen.getByText('Try It On')).toBeInTheDocument()
  })

  it('does not show the try-on section when the product has no image', async () => {
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

    expect(screen.queryByText('Try It On')).not.toBeInTheDocument()
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

describe('ProductPage — return policy & delivery reassurance', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getProductImages } = await import('@/lib/productImages')
    vi.mocked(getProductImages).mockResolvedValue([])
  })

  it('shows the 30-day return window for a non-prescription product, matching /help', async () => {
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

    expect(screen.getByText(/30-day returns/i)).toBeInTheDocument()
    expect(screen.queryByText(/14-day returns/i)).not.toBeInTheDocument()
  })

  it('shows the 14-day return window for a prescription-required product, matching /help', async () => {
    const { getProductById } = await import('@/lib/products')
    vi.mocked(getProductById).mockResolvedValueOnce({
      id: 'prod-002', name: 'Rx Frame', description: null,
      price: 129.99, category: 'frames' as const, sku: 'RX-001',
      stockQuantity: 10, imageUrl: null, requiresPrescription: true,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const { CartProvider } = await import('@/components/cart/CartContext')
    const ProductPage = (await import('./page')).default
    render(<CartProvider>{await ProductPage({ params: { id: 'prod-002' } })}</CartProvider>)

    expect(screen.getByText(/14-day returns/i)).toBeInTheDocument()
    expect(screen.queryByText(/30-day returns/i)).not.toBeInTheDocument()
  })

  it('shows a free return shipping callout', async () => {
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

    expect(screen.getByText(/free return shipping/i)).toBeInTheDocument()
  })

  it('shows a static delivery estimate matching the figure already on /help', async () => {
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

    expect(screen.getByText(/5–7 business days/i)).toBeInTheDocument()
  })

  it('links to /help for the full policy rather than duplicating it', async () => {
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

    expect(screen.getByRole('link', { name: /full policy/i })).toHaveAttribute('href', '/help')
  })

  it('shows the reassurance section even when the product is out of stock', async () => {
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

    expect(screen.getByText(/30-day returns/i)).toBeInTheDocument()
  })
})
