import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/products', () => ({ getInStockProducts: vi.fn() }))

describe('HomePage', () => {
  it('renders a Shop Eyeglasses link to the catalog', async () => {
    const { getInStockProducts } = await import('@/lib/products')
    vi.mocked(getInStockProducts).mockResolvedValueOnce([])

    const { CartProvider } = await import('@/components/cart/CartContext')
    const HomePage = (await import('./page')).default
    render(<CartProvider>{await HomePage()}</CartProvider>)

    const link = screen.getByRole('link', { name: /shop eyeglasses/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/shop')
  })

  it('renders an Upload Prescription link', async () => {
    const { getInStockProducts } = await import('@/lib/products')
    vi.mocked(getInStockProducts).mockResolvedValueOnce([])

    const { CartProvider } = await import('@/components/cart/CartContext')
    const HomePage = (await import('./page')).default
    render(<CartProvider>{await HomePage()}</CartProvider>)

    const link = screen.getByRole('link', { name: /upload prescription/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/prescription-upload')
  })
})
