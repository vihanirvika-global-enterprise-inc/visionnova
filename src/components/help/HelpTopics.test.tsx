import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HelpTopics } from './HelpTopics'
import { FAQ_SECTIONS, faqSectionAnchorId } from '@/lib/faq'
import type { FaqSection } from '@/lib/faq'

const sections: FaqSection[] = [
  { title: 'Ordering & Prescriptions', items: [
    { question: 'a', answer: 'a' }, { question: 'b', answer: 'b' },
    { question: 'c', answer: 'c' }, { question: 'd', answer: 'd' },
  ] },
  { title: 'Payments', items: [{ question: 'e', answer: 'e' }] },
]

describe('HelpTopics', () => {
  it('renders one tile per real FAQ section', () => {
    render(<HelpTopics sections={FAQ_SECTIONS} />)

    const nav = screen.getByRole('navigation', { name: /help topics/i })
    expect(within(nav).getAllByRole('link')).toHaveLength(FAQ_SECTIONS.length)
  })

  // The mockup said "12 articles" under every tile. There is no article store
  // — the only real number is how many questions the section actually holds.
  it('states the real question count, not an invented article count', () => {
    render(<HelpTopics sections={sections} />)

    const nav = screen.getByRole('navigation', { name: /help topics/i })
    expect(within(nav).getByText('4 questions')).toBeInTheDocument()
  })

  it('uses the singular for a section with one question', () => {
    render(<HelpTopics sections={sections} />)

    expect(screen.getByText('1 question')).toBeInTheDocument()
  })

  it('never says "articles", which nothing in this app stores', () => {
    const { container } = render(<HelpTopics sections={FAQ_SECTIONS} />)

    expect(container.textContent ?? '').not.toMatch(/article/i)
  })

  it('jumps to the matching section anchor', () => {
    render(<HelpTopics sections={sections} />)

    expect(screen.getByRole('link', { name: /payments/i }))
      .toHaveAttribute('href', `#${faqSectionAnchorId('Payments')}`)
  })

  it('names each tile after its section, so the links are distinguishable', () => {
    render(<HelpTopics sections={FAQ_SECTIONS} />)

    for (const section of FAQ_SECTIONS) {
      expect(screen.getByRole('link', { name: new RegExp(section.title.replace('&', '&'), 'i') }))
        .toBeInTheDocument()
    }
  })

  it('renders nothing rather than an empty rail when there are no sections', () => {
    const { container } = render(<HelpTopics sections={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
