import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RootLayout from './layout'

describe('RootLayout', () => {
  it('renders the Navbar and children', () => {
    render(<RootLayout><p>page content</p></RootLayout>)
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByText('page content')).toBeInTheDocument()
  })
})
