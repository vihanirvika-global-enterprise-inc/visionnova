import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VerifyOtpPage from './page'

vi.mock('./actions', () => ({
  verifyOtpAction: vi.fn(),
}))

import { verifyOtpAction } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

async function submit(code = '123456') {
  await userEvent.type(screen.getByLabelText(/verification code/i), code)
  await userEvent.click(screen.getByRole('button', { name: /verify/i }))
}

describe('VerifyOtpPage', () => {
  it('renders a code input field', () => {
    render(<VerifyOtpPage />)
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
  })

  it('renders a verify submit button', () => {
    render(<VerifyOtpPage />)
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument()
  })

  it('displays an error message returned by the action', async () => {
    vi.mocked(verifyOtpAction).mockResolvedValue({ formError: 'That code is invalid or has expired' })

    render(<VerifyOtpPage />)
    await submit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('That code is invalid or has expired')
    })
  })

  it('surfaces the rate-limit countdown with the actual seconds', async () => {
    vi.mocked(verifyOtpAction).mockResolvedValue({
      formError: 'Too many attempts. Try again in 9 seconds.',
    })

    render(<VerifyOtpPage />)
    await submit()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Try again in 9 seconds')
    })
  })

  it('marks the code field required so an empty submit is caught before the server', () => {
    render(<VerifyOtpPage />)
    expect(screen.getByLabelText(/verification code/i)).toBeRequired()
  })

  it('moves focus back to the code field after a failed attempt', async () => {
    vi.mocked(verifyOtpAction).mockResolvedValue({ formError: 'That code is invalid or has expired' })

    render(<VerifyOtpPage />)
    await submit()

    await waitFor(() => expect(screen.getByLabelText(/verification code/i)).toHaveFocus())
  })
})

// Pre-hydration safety. Submission runs through onSubmit + preventDefault,
// which does not exist until React hydrates. In that window the browser
// performs the form's native submit, and a GET form serialises every field
// into the query string -- putting the credential in browser history, the
// Referer header of the next navigation, and every proxy and server access
// log. method=post is what makes that structurally impossible, independent
// of whether any JavaScript has run.
describe('OTP verification form — pre-hydration submit safety', () => {
  it('declares method=post so a native submit cannot put credentials in the URL', () => {
    const { container } = render(<VerifyOtpPage />)

    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    expect(form).toHaveAttribute('method', 'post')
  })
})
