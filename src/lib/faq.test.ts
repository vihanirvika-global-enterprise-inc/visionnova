import { describe, it, expect } from 'vitest'
import { FAQ_SECTIONS, searchFaq, faqSectionAnchorId } from './faq'

describe('FAQ_SECTIONS', () => {
  it('has at least one section with at least one item', () => {
    expect(FAQ_SECTIONS.length).toBeGreaterThan(0)
    expect(FAQ_SECTIONS[0].items.length).toBeGreaterThan(0)
  })
})

describe('searchFaq', () => {
  it('returns every section unfiltered when the query is empty', () => {
    const result = searchFaq(FAQ_SECTIONS, '')
    expect(result).toEqual(FAQ_SECTIONS)
  })

  it('matches a query against the question text, case-insensitively', () => {
    const result = searchFaq(FAQ_SECTIONS, 'PRESCRIPTION')
    const allQuestions = result.flatMap((s) => s.items.map((i) => i.question))
    expect(allQuestions.some((q) => /prescription/i.test(q))).toBe(true)
  })

  it('matches a query against the answer text too, not just the question', () => {
    // "Razorpay" appears in an answer but not in any question wording.
    const result = searchFaq(FAQ_SECTIONS, 'razorpay')
    const allText = result.flatMap((s) => s.items.map((i) => i.answer)).join(' ')
    expect(allText).toMatch(/razorpay/i)
  })

  it('omits sections that have no matching items', () => {
    const result = searchFaq(FAQ_SECTIONS, 'razorpay')
    const sectionTitles = result.map((s) => s.title)
    expect(sectionTitles).not.toContain('Shipping & Delivery')
  })

  it('returns no sections at all for a query matching nothing', () => {
    const result = searchFaq(FAQ_SECTIONS, 'xyzzy-not-a-real-topic')
    expect(result).toEqual([])
  })
})

// Topic tiles on /help jump to a section further down the same page, so the
// anchor has to be derived from the section title in one place — a tile and a
// heading computing it separately would drift the first time a title changes.
describe('faqSectionAnchorId', () => {
  it('derives a stable anchor from the section title', () => {
    expect(faqSectionAnchorId('Shipping & Delivery')).toBe('faq-shipping-delivery')
  })

  it('is url-safe for every real section', () => {
    for (const section of FAQ_SECTIONS) {
      expect(faqSectionAnchorId(section.title)).toMatch(/^faq-[a-z0-9-]+$/)
    }
  })

  it('gives every real section a distinct anchor', () => {
    const ids = FAQ_SECTIONS.map((s) => faqSectionAnchorId(s.title))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('collapses punctuation rather than emitting it', () => {
    expect(faqSectionAnchorId('Privacy & Account')).toBe('faq-privacy-account')
    expect(faqSectionAnchorId('Returns & Refunds')).toBe('faq-returns-refunds')
  })
})
