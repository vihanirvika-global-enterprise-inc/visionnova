import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import * as Session from '@/lib/session'
import { CartProvider } from '@/components/cart/CartContext'
import { AuthNavbar } from './AuthNavbar'

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

describe('AuthNavbar', () => {
  it('renders login link when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    render(<CartProvider>{await AuthNavbar()}</CartProvider>)

    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument()
  })

  it('renders logout button when a session exists', async () => {
    vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-1' })

    render(<CartProvider>{await AuthNavbar()}</CartProvider>)

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })
})
