import { render, screen } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { Footer } from './Footer'

// These four previously pointed at /legal/terms, /legal/privacy,
// /legal/returns and /legal/shipping. No src/app/legal route exists, so every
// one of them 404'd — on every page of the site, since the footer is global.
describe('Footer legal links', () => {
  it('renders the footer landmark', () => {
    render(<Footer />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  // /help genuinely carries the returns and shipping policy (its "Returns &
  // Refunds" and "Shipping & Delivery" sections), so these are real
  // destinations rather than a redirect to something unrelated.
  it('points Returns and Shipping at the help page, which holds that policy', () => {
    render(<Footer />)

    expect(screen.getByRole('link', { name: 'Returns' })).toHaveAttribute('href', '/help')
    expect(screen.getByRole('link', { name: 'Shipping' })).toHaveAttribute('href', '/help')
  })

  // No Terms of Service or Privacy Policy document exists anywhere in the
  // codebase. A link is not offered rather than pointing one at a 404 or at
  // unrelated content — the Grievance Officer block below is the real,
  // statutorily-designated contact for data-protection questions.
  it('does not link to a Terms or Privacy document that does not exist', () => {
    render(<Footer />)

    expect(screen.queryByRole('link', { name: 'Terms' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Privacy' })).not.toBeInTheDocument()
  })

  it('never links into /legal, which has no routes', () => {
    const { container } = render(<Footer />)

    const legalLinks = Array.from(container.querySelectorAll('a[href^="/legal"]'))
    expect(legalLinks).toHaveLength(0)
  })
})

describe('Footer Grievance Officer contact', () => {
  const ORIGINAL_ENV = { ...process.env }

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('renders an accessible Grievance Officer heading', () => {
    render(<Footer />)
    expect(screen.getByRole('heading', { name: 'Grievance Officer' })).toBeInTheDocument()
  })

  it('renders the configured name, email, and phone from env vars', () => {
    process.env.GRIEVANCE_OFFICER_NAME = 'Asha Rao'
    process.env.GRIEVANCE_OFFICER_EMAIL = 'grievance@visionnova.com'
    process.env.GRIEVANCE_OFFICER_PHONE = '+91-80-1234-5678'

    render(<Footer />)

    expect(screen.getByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'grievance@visionnova.com' })).toHaveAttribute(
      'href',
      'mailto:grievance@visionnova.com'
    )
    expect(screen.getByRole('link', { name: '+91-80-1234-5678' })).toHaveAttribute(
      'href',
      'tel:+91-80-1234-5678'
    )
  })

  // A quiet grey fallback line was easy to miss in review or QA — exactly
  // the kind of thing that ships to production unnoticed, which is how the
  // statutory contact point ended up unconfigured in practice. This must be
  // impossible to miss: an alert, not a footnote.
  it('renders a loud, unmissable alert — not a quiet fallback line — when unconfigured', () => {
    delete process.env.GRIEVANCE_OFFICER_NAME
    delete process.env.GRIEVANCE_OFFICER_EMAIL
    delete process.env.GRIEVANCE_OFFICER_PHONE

    render(<Footer />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/grievance officer contact.*not configured/i)
    expect(alert).toHaveTextContent(/dpdp/i)
  })

  it('does not render a mailto or tel link when unconfigured', () => {
    delete process.env.GRIEVANCE_OFFICER_NAME
    delete process.env.GRIEVANCE_OFFICER_EMAIL
    delete process.env.GRIEVANCE_OFFICER_PHONE

    render(<Footer />)

    expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument()
  })

  // Name without a reachable channel isn't a real contact point either —
  // email is the functional minimum (it's what the mailto link uses), so a
  // name with no email still counts as unconfigured.
  it('still alerts when a name is set but the email is missing', () => {
    process.env.GRIEVANCE_OFFICER_NAME = 'Asha Rao'
    delete process.env.GRIEVANCE_OFFICER_EMAIL

    render(<Footer />)

    expect(screen.getByRole('alert')).toHaveTextContent(/not configured/i)
  })

  // Phone stays genuinely optional — email is the required channel.
  it('does not alert when name and email are set but phone is missing', () => {
    process.env.GRIEVANCE_OFFICER_NAME = 'Asha Rao'
    process.env.GRIEVANCE_OFFICER_EMAIL = 'grievance@visionnova.com'
    delete process.env.GRIEVANCE_OFFICER_PHONE

    render(<Footer />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'grievance@visionnova.com' })).toBeInTheDocument()
  })
})

describe('Footer newsletter signup', () => {
  it('renders the newsletter signup form', () => {
    render(<Footer />)
    expect(screen.getByRole('form', { name: /newsletter signup/i })).toBeInTheDocument()
  })
})
