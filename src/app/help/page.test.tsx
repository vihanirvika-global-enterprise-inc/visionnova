import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HelpPage from './page'
import { FAQ_SECTIONS, faqSectionAnchorId } from '@/lib/faq'

// Returns the answer text for a question, so assertions target the specific
// Q&A rather than matching stray text elsewhere on the page.
function answerFor(questionPattern: RegExp): string {
  const answer = screen
    .getByText(questionPattern)
    .closest('details')
    ?.querySelector('p')
  return answer?.textContent ?? ''
}

describe('HelpPage prescription security copy', () => {
  it('does not claim encryption that has no backing implementation', () => {
    render(<HelpPage />)
    expect(answerFor(/is my prescription data secure/i)).not.toMatch(/encrypt/i)
  })

  it('describes the security properties that are actually real: access control and logging', () => {
    render(<HelpPage />)
    expect(answerFor(/is my prescription data secure/i)).toMatch(/access/i)
  })
})

// PR #17 wired the PDP's return-policy copy to point here rather than
// duplicate it, so these figures are a cross-page contract. The PDP side is
// already pinned in shop/[id]/page.test.tsx; without these assertions the
// /help side could drift and only the PDP would keep claiming the old numbers.
describe('HelpPage return policy figures — shared contract with the PDP', () => {
  it('states the 30-day window for non-prescription frames', () => {
    render(<HelpPage />)
    expect(answerFor(/what is your return policy/i)).toMatch(/30-day returns on non-prescription frames/i)
  })

  it('states the 14-day window for prescription glasses', () => {
    render(<HelpPage />)
    expect(answerFor(/what is your return policy/i)).toMatch(/14-day returns on prescription glasses/i)
  })

  it('states the 5–7 business day refund window', () => {
    render(<HelpPage />)
    expect(answerFor(/when will i receive my refund/i)).toMatch(/5–7 business days/i)
  })

  it('states the 5–7 business day standard delivery window', () => {
    render(<HelpPage />)
    expect(answerFor(/how long does delivery take/i)).toMatch(/5–7 business days/i)
  })
})

// Each of these described something the codebase cannot do. A customer
// following the PDP's "See full policy" link was being told to use flows that
// do not exist.
describe('HelpPage — claims must match what the implementation actually does', () => {
  // ST-017 later added a real "Request Return / Exchange" affordance to the
  // order detail page — but it's a styled mailto link (same honest pattern
  // as this FAQ answer), not self-service automation, so this FAQ copy
  // still shouldn't claim more than "email us" describes.
  it('does not promise return automation beyond the real email-based process', () => {
    render(<HelpPage />)
    const answer = answerFor(/how do i start a return/i)

    expect(answer).not.toMatch(/request return/i)
    expect(answer).toMatch(/support@visionnova\.com/i)
  })

  // The prepaid-label SLA was invented copy — no return system exists to
  // honour it, so no timeline is promised until one does.
  it('does not promise a prepaid return label within a fixed timeframe', () => {
    render(<HelpPage />)
    expect(answerFor(/how do i start a return/i)).not.toMatch(/within 24 hours/i)
  })

  it('does not advertise express delivery, which checkout does not offer', () => {
    render(<HelpPage />)
    expect(answerFor(/how long does delivery take/i)).not.toMatch(/express/i)
  })

  // checkoutAction hard-blocks any order containing a prescription-required
  // item unless an approved prescription already exists, so both
  // upload-during-checkout and upload-after-ordering are impossible.
  it('does not tell customers to upload a prescription during checkout', () => {
    render(<HelpPage />)
    expect(answerFor(/do i need a prescription to order/i)).not.toMatch(/during checkout/i)
  })

  it('does not tell customers to upload a prescription after placing an order', () => {
    render(<HelpPage />)
    expect(answerFor(/how do i upload my prescription/i)).not.toMatch(/after placing your order/i)
  })

  it('describes the real order of operations: verify before ordering', () => {
    render(<HelpPage />)
    expect(answerFor(/do i need a prescription to order/i)).toMatch(/before you (place|can place)/i)
  })

  // OrderShippedEmail contains no tracking link — it directs customers to
  // their account.
  it('does not promise a tracking link by email', () => {
    render(<HelpPage />)
    expect(answerFor(/can i track my order/i)).not.toMatch(/tracking link/i)
  })

  it('directs order tracking to the account, matching what the shipped email says', () => {
    render(<HelpPage />)
    expect(answerFor(/can i track my order/i)).toMatch(/account/i)
  })

  // PrescriptionStatusEmail sends only {firstName, status} — the rejection
  // reason is recorded in prescription_review_logs but never reaches the
  // customer, by email or anywhere in the UI.
  it('does not promise that the rejection email states the exact reason', () => {
    render(<HelpPage />)
    expect(answerFor(/my prescription was rejected/i)).not.toMatch(/exact reason/i)
  })

  it('still tells a rejected customer what to do next', () => {
    render(<HelpPage />)
    expect(answerFor(/my prescription was rejected/i)).toMatch(/re-upload/i)
  })
})

describe('HelpPage payment section', () => {
  it('has a Payments category', () => {
    render(<HelpPage />)
    expect(screen.getByRole('heading', { name: /payments/i })).toBeInTheDocument()
  })

  it('names Razorpay, the provider actually used for Indian orders', () => {
    render(<HelpPage />)
    expect(answerFor(/what payment methods/i)).toMatch(/razorpay/i)
  })

  it('states that card details do not reach VisionNova servers', () => {
    render(<HelpPage />)
    expect(answerFor(/is my payment information secure/i)).toMatch(/never reach|never stored|do not reach/i)
  })

  // The order is only marked paid by a signature-verified webhook, never by
  // the browser returning from the payment provider.
  it('describes server-side payment confirmation rather than browser-reported success', () => {
    render(<HelpPage />)
    expect(answerFor(/is my payment information secure/i)).toMatch(/verif/i)
  })
})

// ST-020 (B5. Help Center & Support — "FAQ search returns relevant
// results"). FaqSearch itself is unit-tested in isolation
// (src/components/help/FaqSearch.test.tsx) — this only proves it's actually
// wired into the real page with the real FAQ content behind it.
describe('HelpPage FAQ search', () => {
  it('renders a search box', () => {
    render(<HelpPage />)
    expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument()
  })
})

describe('HelpPage currency', () => {
  it('shows no dollar amounts on an India-first storefront', () => {
    const { container } = render(<HelpPage />)
    expect(container.textContent).not.toMatch(/\$\d/)
  })
})

describe('HelpPage — topic tiles', () => {
  it('offers a tile for every real FAQ section', () => {
    render(<HelpPage />)

    const nav = screen.getByRole('navigation', { name: /help topics/i })
    expect(within(nav).getAllByRole('link')).toHaveLength(FAQ_SECTIONS.length)
  })

  it('lands each tile on a section that exists on this page', () => {
    const { container } = render(<HelpPage />)

    const nav = screen.getByRole('navigation', { name: /help topics/i })
    for (const link of within(nav).getAllByRole('link')) {
      const href = link.getAttribute('href') ?? ''
      expect(href.startsWith('#')).toBe(true)
      expect(container.querySelector(href)).not.toBeNull()
    }
  })

  it('counts questions from the real sections', () => {
    render(<HelpPage />)

    const nav = screen.getByRole('navigation', { name: /help topics/i })
    const first = FAQ_SECTIONS[0]
    const expected = `${first.items.length} ${first.items.length === 1 ? 'question' : 'questions'}`
    expect(within(nav).getByText(expected)).toBeInTheDocument()
  })
})

describe('HelpPage — contact', () => {
  it('offers the support mailbox', () => {
    render(<HelpPage />)

    expect(screen.getByRole('link', { name: /email support/i }))
      .toHaveAttribute('href', 'mailto:support@visionnova.com')
  })

  // /about carries the only contact form with a server action, rate limiting
  // and persistence behind it. A second form here would need its own backend.
  it('points at the contact form that actually exists rather than duplicating it', () => {
    render(<HelpPage />)

    expect(screen.getByRole('link', { name: /send us a message/i }))
      .toHaveAttribute('href', '/about#contact')
  })
})

// The mockup's contact rail carried a phone number, a WhatsApp link, staffed
// hours and a "12-hour response SLA". None of them has a source: there is no
// phone number anywhere in this repo's config, no WhatsApp integration, and
// the only "12 hours" in faq.ts is prescription verification — not a support
// response time. Publishing a number nobody answers is worse than none.
describe('HelpPage — ships no unbacked contact channels', () => {
  it('publishes no phone number', () => {
    const { container } = render(<HelpPage />)
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/\+91[\s\d-]{8,}/)
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('offers no WhatsApp channel', () => {
    const { container } = render(<HelpPage />)

    expect(container.textContent ?? '').not.toMatch(/whatsapp/i)
    expect(container.querySelector('a[href*="wa.me"], a[href*="whatsapp"]')).toBeNull()
  })

  it('claims no support response time or staffed hours', () => {
    const { container } = render(<HelpPage />)
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/\d+\s*-?\s*hour (response|sla|reply)/i)
    expect(text).not.toMatch(/mon\s*[–-]\s*sat|10:00\s*[–-]\s*18:00/i)
  })

  it('counts no articles, which nothing in this app stores', () => {
    const { container } = render(<HelpPage />)

    expect(container.textContent ?? '').not.toMatch(/\d+\s+articles?\b/i)
  })
})

describe('HelpPage — section anchors', () => {
  it('renders every real section heading with the anchor its tile links to', () => {
    render(<HelpPage />)

    for (const section of FAQ_SECTIONS) {
      expect(screen.getByRole('heading', { name: section.title }))
        .toHaveAttribute('id', faqSectionAnchorId(section.title))
    }
  })
})
