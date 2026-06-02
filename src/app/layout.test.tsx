import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RootLayout from './layout'

vi.mock('@/components/layout/AuthNavbar', () => ({
  AuthNavbar: () => <nav aria-label="main navigation" />,
}))

describe('RootLayout', () => {
  it('renders the navigation and children', () => {
    render(<RootLayout><p>page content</p></RootLayout>)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText('page content')).toBeInTheDocument()
  })
})
