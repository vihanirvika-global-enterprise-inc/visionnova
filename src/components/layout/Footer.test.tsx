import { render, screen, within } from '@testing-library/react'
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

// The strongest guard in this file: rather than asserting a hand-written list
// of hrefs, it derives the real route table from src/app and requires every
// footer link to be in it. A renamed or deleted route fails here instead of
// shipping a 404 on every page of the site.
describe('Footer link destinations', () => {
  function realRoutes(): Set<string> {
    const fs = require('fs') as typeof import('fs')
    const path = require('path') as typeof import('path')
    const appDir = path.join(process.cwd(), 'src', 'app')
    const routes = new Set<string>()

    function walk(dir: string, segments: string[]) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          if (entry.name === 'page.tsx') routes.add('/' + segments.join('/'))
          continue
        }
        // (auth) and friends are route groups — they don't appear in the URL.
        const isGroup = entry.name.startsWith('(') && entry.name.endsWith(')')
        walk(path.join(dir, entry.name), isGroup ? segments : [...segments, entry.name])
      }
    }
    walk(appDir, [])
    return routes
  }

  it('links only to routes that exist', () => {
    const { container } = render(<Footer />)
    const routes = realRoutes()

    const internal = Array.from(container.querySelectorAll('a[href^="/"]'))
      .map((a) => a.getAttribute('href') as string)
      .map((href) => href.split(/[?#]/)[0])
      .map((href) => (href.length > 1 ? href.replace(/\/$/, '') : href))

    expect(internal.length).toBeGreaterThan(0)
    const missing = internal.filter((href) => !routes.has(href))
    expect(missing).toEqual([])
  })
})

describe('Footer navigation columns', () => {
  it('groups the shop links under a labelled Shop nav', () => {
    render(<Footer />)
    const shop = screen.getByRole('navigation', { name: 'Shop' })

    expect(within(shop).getByRole('link', { name: 'Eyeglasses' })).toHaveAttribute('href', '/shop')
    expect(within(shop).getByRole('link', { name: 'Sunglasses' })).toHaveAttribute('href', '/sunglasses')
    expect(within(shop).getByRole('link', { name: 'Contact lenses' })).toHaveAttribute('href', '/contacts')
  })

  it('groups the clinical links under a labelled Eye care nav', () => {
    render(<Footer />)
    const care = screen.getByRole('navigation', { name: 'Eye care' })

    expect(within(care).getByRole('link', { name: 'Book an eye test' })).toHaveAttribute('href', '/eye-test')
    expect(within(care).getByRole('link', { name: 'Upload prescription' })).toHaveAttribute('href', '/prescription-upload')
    expect(within(care).getByRole('link', { name: 'For optometrists' })).toHaveAttribute('href', '/partner-portal/register')
  })

  it('groups the company links under a labelled About nav', () => {
    render(<Footer />)
    const about = screen.getByRole('navigation', { name: 'About' })

    expect(within(about).getByRole('link', { name: 'About VisionNova' })).toHaveAttribute('href', '/about')
    expect(within(about).getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/about')
  })

  // The roadmap lists a Legal column, but no Terms, Privacy Policy or Cookie
  // Policy document exists to link to. An empty column heading is worse than
  // no column — it advertises documents we cannot produce — so the heading is
  // withheld until the routes exist.
  it('does not render an empty Legal column', () => {
    render(<Footer />)
    expect(screen.queryByRole('navigation', { name: 'Legal' })).not.toBeInTheDocument()
  })
})

describe('Footer statutory identifiers', () => {
  // Ruling: omit the numbers, keep the TODO. An invented GSTIN or CDSCO
  // licence number is a claim we cannot substantiate, not a styling
  // placeholder — so the mockup's values must not appear even as filler.
  it('renders no GSTIN, CIN or CDSCO number', () => {
    const { container } = render(<Footer />)
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/GSTIN/i)
    expect(text).not.toMatch(/\bCIN\b/i)
    expect(text).not.toMatch(/CDSCO/i)
    expect(text).not.toMatch(/29ABCDE1234F1Z5|U74999KA2024PTC012345|MFG\/2024\/00123/)
  })

  it('does not state an unverified legal entity name', () => {
    const { container } = render(<Footer />)
    expect(container.textContent ?? '').not.toMatch(/Pvt\.? ?Ltd/i)
  })
})

describe('Footer anti-spam contact', () => {
  it('renders the configured anti-spam mailbox', () => {
    process.env.ANTI_SPAM_CONTACT_EMAIL = 'unsubscribe@example.com'
    render(<Footer />)

    expect(screen.getByRole('link', { name: 'unsubscribe@example.com' }))
      .toHaveAttribute('href', 'mailto:unsubscribe@example.com')
  })

  it('renders nothing rather than inventing an address when unconfigured', () => {
    delete process.env.ANTI_SPAM_CONTACT_EMAIL
    const { container } = render(<Footer />)

    expect(container.textContent ?? '').not.toMatch(/unsubscribe|anti-spam/i)
  })
})

describe('Footer store locator link', () => {
  it('links to the store locator', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Store Locator' })).toHaveAttribute('href', '/stores')
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

  // Scoped to the Grievance Officer section specifically: the footer's
  // newsletter line always has its own mailto link, unrelated to whether the
  // Grievance Officer contact is configured.
  it('does not render a grievance mailto or tel link when unconfigured', () => {
    delete process.env.GRIEVANCE_OFFICER_NAME
    delete process.env.GRIEVANCE_OFFICER_EMAIL
    delete process.env.GRIEVANCE_OFFICER_PHONE

    render(<Footer />)

    const section = screen.getByRole('alert').closest('section')!
    expect(within(section).queryByRole('link', { name: /@/ })).not.toBeInTheDocument()
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

// NewsletterSignupForm looked like a working subscribe flow and wasn't — no
// server action, no persistence. Removed in favor of honest interim copy; this
// pins that the footer's newsletter affordance actually goes where it says.
describe('Footer newsletter', () => {
  it('does not render a fake subscribe form', () => {
    render(<Footer />)
    expect(screen.queryByRole('form', { name: /newsletter signup/i })).not.toBeInTheDocument()
  })

  it('points readers at the real newsletter mailbox stated in the copy', () => {
    render(<Footer />)

    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /newsletter@visionnova\.com/i })).toHaveAttribute(
      'href', 'mailto:newsletter@visionnova.com'
    )
  })
})
