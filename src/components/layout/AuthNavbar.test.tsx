import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import * as Session from '@/lib/session'
import { CartProvider } from '@/components/cart/CartContext'
import { AuthNavbar } from './AuthNavbar'

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

// Navbar also renders MobileBottomNav, which duplicates the Sign In/Sign Out
// controls — scope queries to the top nav landmark to avoid ambiguous matches.
function getMainNav() {
  return screen.getByRole('navigation', { name: /main navigation/i })
}

describe('AuthNavbar', () => {
  it('renders login link when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    render(<CartProvider>{await AuthNavbar()}</CartProvider>)

    expect(within(getMainNav()).getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders logout button when a session exists', async () => {
    vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })

    render(<CartProvider>{await AuthNavbar()}</CartProvider>)

    expect(within(getMainNav()).getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })
})
