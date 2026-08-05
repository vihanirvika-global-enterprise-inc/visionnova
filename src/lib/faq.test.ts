import { describe, it, expect } from 'vitest'
import { FAQ_SECTIONS, searchFaq } from './faq'

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
