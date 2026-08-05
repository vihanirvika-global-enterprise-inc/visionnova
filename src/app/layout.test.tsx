import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RootLayout from './layout'

vi.mock('@/components/layout/AuthNavbar', () => ({
  AuthNavbar: () => <nav aria-label="main navigation" />,
}))
vi.mock('@/components/wishlist/WishlistProviderServer', () => ({
  WishlistProviderServer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('RootLayout', () => {
  it('renders the navigation and children', () => {
    render(<RootLayout><p>page content</p></RootLayout>)
    expect(screen.getByRole('navigation', { name: 'main navigation' })).toBeInTheDocument()
    expect(screen.getByText('page content')).toBeInTheDocument()
  })
})

// WCAG 2.4.1 Bypass Blocks (Level A): without this, a keyboard user tabs the
// entire navigation on every page before reaching content.
describe('RootLayout skip link', () => {
  it('offers a skip link as the first focusable element', () => {
    render(<RootLayout><p>page content</p></RootLayout>)

    const skip = screen.getByRole('link', { name: /skip to main content/i })
    expect(skip).toHaveAttribute('href', '#main-content')
  })

  it('points at a focusable target wrapping the page content', () => {
    const { container } = render(<RootLayout><p>page content</p></RootLayout>)

    const target = container.querySelector('#main-content')
    expect(target).not.toBeNull()
    // tabindex -1 so focus actually moves when the link is followed
    expect(target).toHaveAttribute('tabindex', '-1')
    expect(target).toHaveTextContent('page content')
  })

  it('is visually hidden until focused, not removed from the tab order', () => {
    render(<RootLayout><p>page content</p></RootLayout>)

    const skip = screen.getByRole('link', { name: /skip to main content/i })
    expect(skip.className).toMatch(/sr-only/)
    expect(skip.className).toMatch(/focus:not-sr-only/)
  })
})

describe('RootLayout fonts', () => {
  it('applies the Plus Jakarta Sans and IBM Plex Mono font variables to the body', () => {
    const { container } = render(<RootLayout><p>page content</p></RootLayout>)

    const body = container.querySelector('body')
    expect(body?.className).toContain('--font-plus-jakarta-sans')
    expect(body?.className).toContain('--font-ibm-plex-mono')
  })
})

describe('RootLayout footer', () => {
  it('renders the Footer on every route', () => {
    render(<RootLayout><p>page content</p></RootLayout>)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
