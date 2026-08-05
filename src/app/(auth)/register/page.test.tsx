import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy'
import RegisterPage from './page'

vi.mock('./actions', () => ({
  registerAction: vi.fn(),
}))

import { registerAction } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

async function fillAndSubmit(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    firstName: 'Ada', lastName: 'Lovelace',
    email: 'ada@example.com', password: 'a-long-enough-password',
    ...overrides,
  }
  if (values.firstName) await userEvent.type(screen.getByLabelText(/first name/i), values.firstName)
  if (values.lastName) await userEvent.type(screen.getByLabelText(/last name/i), values.lastName)
  if (values.email) await userEvent.type(screen.getByLabelText(/email/i), values.email)
  if (values.password) await userEvent.type(screen.getByLabelText('Password'), values.password)
  await userEvent.click(screen.getByRole('button', { name: /create account/i }))
}

describe('RegisterPage', () => {
  it('renders email and password input fields', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
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

  it('displays an error message returned by the action', async () => {
    vi.mocked(registerAction).mockResolvedValue({
      fieldErrors: { password: [`Password must be at least ${MIN_PASSWORD_LENGTH} characters`] },
    })

    render(<RegisterPage />)
    await fillAndSubmit({ password: 'short' })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      )
    })
  })
})

describe('RegisterPage client-side validation', () => {
  it('marks every field required so an empty submit is caught before the server', () => {
    render(<RegisterPage />)

    expect(screen.getByLabelText(/first name/i)).toBeRequired()
    expect(screen.getByLabelText(/last name/i)).toBeRequired()
    expect(screen.getByLabelText(/email/i)).toBeRequired()
    expect(screen.getByLabelText('Password')).toBeRequired()
  })

  // Imported from the same constant the server validates against, so raising
  // the minimum cannot leave the form advertising the old rule.
  it('enforces the real password minimum on the input', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'minlength', String(MIN_PASSWORD_LENGTH)
    )
  })

  it('states the password rule before the user submits anything', () => {
    render(<RegisterPage />)
    expect(screen.getByText(`At least ${MIN_PASSWORD_LENGTH} characters`)).toBeInTheDocument()
  })

  it('describes the password field by its hint for assistive tech', () => {
    render(<RegisterPage />)
    const password = screen.getByLabelText('Password')
    const describedBy = password.getAttribute('aria-describedby') ?? ''

    expect(describedBy).toContain('password-hint')
  })

  it('uses type=email so the field is validated as an address', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')
  })
})

// These guard PR #7/#8's hardening at the layer users actually see. Each was
// previously covered only in actions/lib tests, so a UI change that swallowed
// the message would not have failed anything.
describe('RegisterPage error surfacing', () => {
  it('renders the duplicate-email error inline on the email field', async () => {
    vi.mocked(registerAction).mockResolvedValue({
      fieldErrors: { email: ['Email already registered'] },
    })

    render(<RegisterPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true')
    })
    const errorId = screen.getByLabelText(/email/i).getAttribute('aria-describedby')!
    expect(document.getElementById(errorId)).toHaveTextContent('Email already registered')
  })

  it('renders the breach warning inline on the password field', async () => {
    vi.mocked(registerAction).mockResolvedValue({
      fieldErrors: { password: ['This password has appeared in a data breach — please choose another'] },
    })

    render(<RegisterPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/data breach/i)
    })
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
  })

  // The core regression guard: the breach message used to be appended last
  // and only errors[0] was shown, so any earlier problem hid it entirely.
  it('shows the breach warning even when another field also has an error', async () => {
    vi.mocked(registerAction).mockResolvedValue({
      fieldErrors: {
        lastName: ['Last name is required'],
        password: ['This password has appeared in a data breach — please choose another'],
      },
    })

    render(<RegisterPage />)
    await fillAndSubmit({ lastName: '' })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/last name is required/i)
    })
    expect(screen.getByRole('alert')).toHaveTextContent(/data breach/i)
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/last name/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('surfaces the rate-limit countdown with the actual seconds', async () => {
    vi.mocked(registerAction).mockResolvedValue({
      formError: 'Too many attempts. Try again in 42 seconds.',
    })

    render(<RegisterPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Try again in 42 seconds')
    })
  })

  it('moves focus to the first field with an error', async () => {
    vi.mocked(registerAction).mockResolvedValue({
      fieldErrors: {
        email: ['Invalid email address'],
        password: ['Password must be at least 10 characters'],
      },
    })

    render(<RegisterPage />)
    await fillAndSubmit()

    // email precedes password in the form, so it takes focus.
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toHaveFocus())
  })

  it('clears previous errors when the form is resubmitted', async () => {
    vi.mocked(registerAction).mockResolvedValueOnce({
      fieldErrors: { email: ['Email already registered'] },
    })

    render(<RegisterPage />)
    await fillAndSubmit()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    vi.mocked(registerAction).mockResolvedValueOnce({})
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
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

// Pre-hydration safety. Submission runs through onSubmit + preventDefault,
// which does not exist until React hydrates. In that window the browser
// performs the form's native submit, and a GET form serialises every field
// into the query string -- putting the credential in browser history, the
// Referer header of the next navigation, and every proxy and server access
// log. method=post is what makes that structurally impossible, independent
// of whether any JavaScript has run.
describe('registration form — pre-hydration submit safety', () => {
  it('declares method=post so a native submit cannot put credentials in the URL', () => {
    const { container } = render(<RegisterPage />)

    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    expect(form).toHaveAttribute('method', 'post')
  })
})
