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

// The meter reports what the server actually enforces — a minimum length and
// a breach check — and nothing else. A bar that scores digits and symbols
// would tell someone their password is weak for failing a rule we do not
// have, and imply that adding a symbol is required when it is not.
describe('RegisterPage — password strength meter', () => {
  it('says nothing until something is typed', () => {
    render(<RegisterPage />)

    expect(screen.queryByTestId('password-strength')).not.toBeInTheDocument()
  })

  it('tells the customer how many more characters are needed', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/^password$/i), 'a'.repeat(MIN_PASSWORD_LENGTH - 3))

    expect(screen.getByTestId('password-strength')).toHaveTextContent(/3 more characters/)
  })

  it('confirms once the password meets the enforced minimum', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/^password$/i), 'a'.repeat(MIN_PASSWORD_LENGTH))

    expect(screen.getByTestId('password-strength')).toHaveTextContent(/meets the minimum/i)
  })

  it('never asks for a character class the validator does not require', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/^password$/i), 'short')

    expect(screen.getByTestId('password-strength').textContent ?? '')
      .not.toMatch(/symbol|uppercase|number|digit|special/i)
  })

  // Screen readers get the assessment too, and only when it changes — a
  // per-keystroke live region would be unusable.
  it('exposes the assessment to assistive technology', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/^password$/i), 'a'.repeat(MIN_PASSWORD_LENGTH))

    expect(screen.getByTestId('password-strength')).toHaveAttribute('role', 'status')
  })

  // The breach check runs server-side on submit and is the other half of what
  // is enforced; saying so before submit stops it reading as an arbitrary
  // rejection afterwards.
  it('mentions the breach check that will run on submit', () => {
    render(<RegisterPage />)

    expect(screen.getByText(/checked against known data breaches/i)).toBeInTheDocument()
  })
})

// Until now only a code comment stopped these coming back. No Terms of
// Service or Privacy Policy document exists — /privacy is still a 404 — so
// asking someone to agree to them collects consent to nothing, which is worse
// than not asking. Tied to the /privacy P0.
describe('RegisterPage — no consent to documents that do not exist', () => {
  it('does not ask the customer to accept Terms or a Privacy Policy', () => {
    render(<RegisterPage />)

    expect(screen.queryByRole('checkbox', { name: /terms|privacy/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^terms/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /privacy policy/i })).not.toBeInTheDocument()
  })

  it('links to no route under /terms or /privacy', () => {
    const { container } = render(<RegisterPage />)

    expect(container.querySelector('a[href^="/terms"]')).toBeNull()
    expect(container.querySelector('a[href^="/privacy"]')).toBeNull()
  })

  it('still says where questions about terms and data go', () => {
    render(<RegisterPage />)

    expect(screen.getByRole('link', { name: /support@visionnova\.com/i })).toBeInTheDocument()
  })

  // The mockup's brand panel promised "Free first video eye test". No fee
  // model exists — eye_test_appointments has no price column — and the
  // homepage rejected the same claim.
  it('promises no free eye test, which nothing in this app prices', () => {
    const { container } = render(<RegisterPage />)

    expect(container.textContent ?? '').not.toMatch(/free .{0,20}eye test|eye test .{0,10}free|₹0/i)
  })

  it('offers no "keep me signed in", which would control nothing', () => {
    render(<RegisterPage />)

    expect(screen.queryByRole('checkbox', { name: /keep me signed in|remember me/i }))
      .not.toBeInTheDocument()
  })
})
