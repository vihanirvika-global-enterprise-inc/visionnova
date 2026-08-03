import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LoginPage from './page'

vi.mock('./actions', () => ({
  loginAction: vi.fn(),
}))

import { loginAction } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

async function submit(email = 'x@x.com', password = 'badpassword') {
  await userEvent.type(screen.getByLabelText(/email/i), email)
  await userEvent.type(screen.getByLabelText(/password/i), password)
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

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
    vi.mocked(loginAction).mockResolvedValue({ formError: 'Invalid email or password' })

    render(<LoginPage />)
    await submit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
    })
  })
})

describe('LoginPage client-side validation', () => {
  it('marks both fields required so an empty submit is caught before the server', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/email/i)).toBeRequired()
    expect(screen.getByLabelText(/password/i)).toBeRequired()
  })

  it('uses type=email so the field is validated as an address', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')
  })
})

// Guards PR #7/#8's hardening at the layer users actually see.
describe('LoginPage error surfacing', () => {
  // Enumeration safety: this must stay generic and must NOT be attributed to
  // the email field, which would hint that the address is or isn't registered.
  it('shows bad credentials as a generic form-level message, not on the email field', async () => {
    vi.mocked(loginAction).mockResolvedValue({ formError: 'Invalid email or password' })

    render(<LoginPage />)
    await submit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
    })
    expect(screen.getByLabelText(/email/i)).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText(/password/i)).not.toHaveAttribute('aria-invalid')
  })

  it('surfaces the rate-limit countdown with the actual seconds', async () => {
    vi.mocked(loginAction).mockResolvedValue({
      formError: 'Too many attempts. Try again in 12 seconds.',
    })

    render(<LoginPage />)
    await submit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Try again in 12 seconds')
    })
  })

  it('marks an invalid email field and describes it by its error', async () => {
    vi.mocked(loginAction).mockResolvedValue({
      fieldErrors: { email: ['Invalid email address'] },
    })

    render(<LoginPage />)
    await submit()

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true')
    })
    const errorId = screen.getByLabelText(/email/i).getAttribute('aria-describedby')!
    expect(document.getElementById(errorId)).toHaveTextContent('Invalid email address')
  })

  it('moves focus to the first field with an error', async () => {
    vi.mocked(loginAction).mockResolvedValue({
      fieldErrors: { email: ['Invalid email address'], password: ['Password is required'] },
    })

    render(<LoginPage />)
    await submit()

    await waitFor(() => expect(screen.getByLabelText(/email/i)).toHaveFocus())
  })

  it('shows every error at once rather than one per submit', async () => {
    vi.mocked(loginAction).mockResolvedValue({
      fieldErrors: { email: ['Invalid email address'], password: ['Password is required'] },
    })

    render(<LoginPage />)
    await submit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address')
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Password is required')
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
