import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import RegisterPage from './page'

vi.mock('./actions', () => ({
  registerAction: vi.fn(),
}))

import { registerAction } from './actions'

describe('RegisterPage', () => {
  it('renders email and password input fields', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders first name and last name input fields', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
  })

  it('renders a create account submit button', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders a link to the login page', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument()
  })

  // 10, not 8 — the minimum was raised and this fixture still quoted the old
  // rule. It's a mock string so it passed either way, which is exactly how a
  // stale rule survives in a test.
  it('displays an error message returned by the action', async () => {
    vi.mocked(registerAction).mockResolvedValue({ error: 'Password must be at least 10 characters' })

    render(<RegisterPage />)
    await userEvent.type(screen.getByLabelText(/first name/i), 'Ada')
    await userEvent.type(screen.getByLabelText(/last name/i), 'Lovelace')
    await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 10 characters')
    })
  })
})

// The form previously said "By creating an account you agree to our Terms of
// Service and Privacy Policy", with both links pointing at /help — an FAQ
// containing neither document. Asking for consent to documents that do not
// exist is a DPDP problem, not just a broken link.
describe('RegisterPage terms and privacy', () => {
  it('does not claim the user is agreeing to documents that do not exist', () => {
    render(<RegisterPage />)

    expect(screen.queryByRole('link', { name: /terms of service/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /privacy policy/i })).not.toBeInTheDocument()
  })

  it('does not present consent language for unpublished documents', () => {
    const { container } = render(<RegisterPage />)

    expect(container.textContent).not.toMatch(/you agree to/i)
  })

  // Removing the fake consent must not leave users with nowhere to ask.
  it('points terms and privacy questions at the real support channel', () => {
    render(<RegisterPage />)

    const support = screen.getByRole('link', { name: /support@visionnova\.com/i })
    expect(support).toHaveAttribute('href', 'mailto:support@visionnova.com')
  })

  it('has no links pointing at /help for legal content', () => {
    const { container } = render(<RegisterPage />)

    const helpLinks = Array.from(container.querySelectorAll('a[href="/help"]'))
    expect(helpLinks).toHaveLength(0)
  })
})
