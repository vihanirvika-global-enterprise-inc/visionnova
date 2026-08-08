import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CatalogLoading from './loading'

describe('CatalogLoading', () => {
  it('announces loading via a labelled status region', () => {
    render(<CatalogLoading />)
    expect(screen.getByRole('status', { name: /loading products/i })).toBeInTheDocument()
  })

  it('renders a skeleton grid matching the real grid column classes', () => {
    render(<CatalogLoading />)
    const grid = screen.getByRole('status', { name: /loading products/i })
    expect(grid).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4')
  })

  it('renders enough skeleton cards to fill a page', () => {
    const { container } = render(<CatalogLoading />)
    const grid = screen.getByRole('status', { name: /loading products/i })
    expect(grid.children).toHaveLength(12)
  })
})
