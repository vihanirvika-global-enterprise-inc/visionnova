import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HomePage from './page'

describe('HomePage', () => {
  it('renders a Shop Now link to the catalog', () => {
    render(<HomePage />)
    const link = screen.getByRole('link', { name: /shop now/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })
})
