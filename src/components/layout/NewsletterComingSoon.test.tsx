import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NewsletterComingSoon } from './NewsletterComingSoon'

// Replaces NewsletterSignupForm, which validated email format client-side and
// on success called setError(null) — no server action, no persistence, no
// confirmation state. It looked functional and did nothing, the same class
// of stub as the dead "Forgot password?" link fixed in PR #25. No real
// newsletter tooling or double-opt-in strategy exists yet (DPDP requires
// explicit, not implied, consent for marketing email), so this is honest
// interim copy rather than a fake subscribe flow.
describe('NewsletterComingSoon', () => {
  it('says the newsletter is not live yet, not implying a working signup', () => {
    render(<NewsletterComingSoon />)
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('points interested readers at a real, reachable mailbox', () => {
    render(<NewsletterComingSoon />)

    const link = screen.getByRole('link', { name: /newsletter@visionnova\.com/i })
    expect(link).toHaveAttribute('href', 'mailto:newsletter@visionnova.com')
  })

  // No fake interactivity — this must not look like a working subscribe flow.
  it('renders no form, no email input, and no Subscribe button', () => {
    render(<NewsletterComingSoon />)

    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /subscribe/i })).not.toBeInTheDocument()
  })
})
