import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VerifyOtpPage from './page'

vi.mock('./actions', () => ({
  verifyOtpAction: vi.fn(),
  resendOtpAction: vi.fn(),
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

// Without this, a code that never arrives strands someone here with no way
// forward but starting the login over.
describe('VerifyOtpPage — resend', () => {
  it('offers a resend once the cooldown has elapsed', async () => {
    vi.useFakeTimers()
    try {
      render(<VerifyOtpPage />)
      await act(async () => { vi.advanceTimersByTime(31_000) })

      expect(screen.getByRole('button', { name: /resend/i })).toBeEnabled()
    } finally {
      vi.useRealTimers()
    }
  })

  // The cooldown starts immediately: the code was just sent by loginAction,
  // so an instant resend is always a wasted send.
  it('starts on cooldown, counting down', () => {
    vi.useFakeTimers()
    try {
      render(<VerifyOtpPage />)

      expect(screen.getByRole('button', { name: /resend/i })).toBeDisabled()
      expect(screen.getByTestId('resend-cooldown')).toHaveTextContent(/\d+\s*s/)
    } finally {
      vi.useRealTimers()
    }
  })

  it('sends a new code and confirms it, then goes back on cooldown', async () => {
    vi.useFakeTimers()
    try {
      const { resendOtpAction } = await import('./actions')
      vi.mocked(resendOtpAction).mockResolvedValue({ sent: true })

      render(<VerifyOtpPage />)
      await act(async () => { vi.advanceTimersByTime(31_000) })
      await act(async () => { screen.getByRole('button', { name: /resend/i }).click() })

      expect(resendOtpAction).toHaveBeenCalled()
      expect(screen.getByRole('status')).toHaveTextContent(/new code/i)
      expect(screen.getByRole('button', { name: /resend/i })).toBeDisabled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('surfaces the reason when a resend is refused', async () => {
    vi.useFakeTimers()
    try {
      const { resendOtpAction } = await import('./actions')
      vi.mocked(resendOtpAction).mockResolvedValue({ sent: false, message: 'Too many requests.' })

      render(<VerifyOtpPage />)
      await act(async () => { vi.advanceTimersByTime(31_000) })
      await act(async () => { screen.getByRole('button', { name: /resend/i }).click() })

      expect(screen.getByRole('status')).toHaveTextContent(/too many requests/i)
    } finally {
      vi.useRealTimers()
    }
  })
})

// The mockup used six single-character boxes. One field keeps
// autocomplete="one-time-code", which is what actually autofills the code
// from the email or SMS on iOS and Android — six boxes usually break it.
describe('VerifyOtpPage — single code field', () => {
  it('uses one field, not six boxes', () => {
    const { container } = render(<VerifyOtpPage />)

    expect(container.querySelectorAll('input[maxlength="1"]')).toHaveLength(0)
    expect(screen.getByLabelText(/verification code/i)).toHaveAttribute('autocomplete', 'one-time-code')
  })
})
