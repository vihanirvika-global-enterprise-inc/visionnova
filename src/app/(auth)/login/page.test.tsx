import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import LoginPage from './page'

vi.mock('./actions', () => ({
  loginAction: vi.fn(),
}))

import { loginAction } from './actions'

describe('LoginPage', () => {
  it('renders email and password input fields', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders a sign in submit button', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders a link to the register page', () => {
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
  })

  it('displays an error message returned by the action', async () => {
    vi.mocked(loginAction).mockResolvedValue({ error: 'Invalid email or password' })

    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText(/email/i), 'x@x.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'badpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
    })
  })
})

// This was href="#" — a control that looked actionable, did nothing, and sat
// on the one page a locked-out user reaches for. No password-reset flow
// exists (no route, action, token table or email template), so it points at
// the real support channel rather than pretending self-service exists.
describe('LoginPage password recovery', () => {
  it('offers a recovery affordance that actually goes somewhere', () => {
    render(<LoginPage />)

    const recovery = screen.getByRole('link', { name: /forgot password/i })
    expect(recovery).toHaveAttribute('href', expect.stringContaining('mailto:support@visionnova.com'))
  })

  it('has no dead placeholder links anywhere on the page', () => {
    const { container } = render(<LoginPage />)

    const deadLinks = Array.from(container.querySelectorAll('a[href="#"], a[href=""]'))
    expect(deadLinks).toHaveLength(0)
  })

  // Wording must not imply a self-service reset email the app cannot send.
  it('does not promise an automated reset email', () => {
    render(<LoginPage />)

    const recovery = screen.getByRole('link', { name: /forgot password/i })
    expect(recovery.textContent).not.toMatch(/reset link|reset email|check your (inbox|email)/i)
  })
})
