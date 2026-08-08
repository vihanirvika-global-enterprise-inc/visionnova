import { describe, it, expect } from 'vitest'
import { describeExpiry, isExpiringSoon, hasExpired } from './prescriptionExpiry'

const NOW = new Date('2026-08-08T12:00:00Z')
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

describe('describeExpiry', () => {
  it('says so when the row carries no expiry, rather than inventing a window', () => {
    expect(describeExpiry(null, NOW)).toBe('No expiry on file')
  })

  it('reports weeks for a prescription lapsing soon', () => {
    expect(describeExpiry(days(42), NOW)).toBe('Expires in 6 weeks')
  })

  it('uses the singular at one week', () => {
    expect(describeExpiry(days(7), NOW)).toBe('Expires in 1 week')
  })

  it('drops to days inside a week, where weeks would round away the urgency', () => {
    expect(describeExpiry(days(3), NOW)).toBe('Expires in 3 days')
  })

  it('names today and tomorrow rather than saying "in 0 days"', () => {
    expect(describeExpiry(days(0), NOW)).toBe('Expires today')
    expect(describeExpiry(days(1), NOW)).toBe('Expires tomorrow')
  })

  it('states plainly that a lapsed prescription has expired, with the date', () => {
    expect(describeExpiry(days(-10), NOW)).toMatch(/^Expired on /)
  })

  // "Expires in 34 weeks" is worse than a date.
  it('falls back to the absolute date beyond the relative horizon', () => {
    expect(describeExpiry(days(200), NOW)).toMatch(/^Expires \d/)
  })

  it('rounds partial days up, so an expiry later today is not reported as expired', () => {
    const laterToday = new Date(NOW.getTime() + 6 * 3_600_000)
    expect(describeExpiry(laterToday, NOW)).toBe('Expires tomorrow')
  })
})

describe('isExpiringSoon', () => {
  it.each([
    ['six weeks out', 42, true],
    ['just inside the window', 41, true],
    ['just outside it', 43, false],
    ['already expired', -1, false],
  ])('%s', (_label, offset, expected) => {
    expect(isExpiringSoon(days(offset), NOW)).toBe(expected)
  })

  it('is false when there is no expiry to judge', () => {
    expect(isExpiringSoon(null, NOW)).toBe(false)
  })
})

describe('hasExpired', () => {
  it('is true only once the date has passed', () => {
    expect(hasExpired(days(-1), NOW)).toBe(true)
    expect(hasExpired(days(1), NOW)).toBe(false)
    expect(hasExpired(null, NOW)).toBe(false)
  })
})
