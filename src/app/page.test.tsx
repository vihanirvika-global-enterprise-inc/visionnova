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

  // Regression: primary moved from cyan to indigo in the design-token
  // milestone, but these two spots hardcoded raw cyan-* classes rather than
  // referencing a token — they read as a coherent cyan-to-cyan pairing
  // before that change, and a silently mismatched indigo/cyan pairing after.
  it('does not pair the (now indigo) primary token with a hardcoded cyan class', async () => {
    const { getInStockProducts } = await import('@/lib/products')
    vi.mocked(getInStockProducts).mockResolvedValueOnce([])

    const { CartProvider } = await import('@/components/cart/CartContext')
    const HomePage = (await import('./page')).default
    const { container } = render(<CartProvider>{await HomePage()}</CartProvider>)

    const html = container.innerHTML
    expect(html).not.toMatch(/cyan-400/)
    expect(html).not.toMatch(/cyan-800/)
  })
})
