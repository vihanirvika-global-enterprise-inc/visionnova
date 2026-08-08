import { describe, it, expect } from 'vitest'
import { describePasswordStrength } from './passwordStrength'
import { MIN_PASSWORD_LENGTH } from './passwordPolicy'

const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
const exact = 'a'.repeat(MIN_PASSWORD_LENGTH)
const long = 'a'.repeat(MIN_PASSWORD_LENGTH + 10)

describe('describePasswordStrength', () => {
  it('says nothing about an empty field', () => {
    expect(describePasswordStrength('')).toBeNull()
  })

  it('fails a password below the enforced minimum', () => {
    expect(describePasswordStrength(short)?.meetsPolicy).toBe(false)
  })

  it('passes at exactly the enforced minimum', () => {
    expect(describePasswordStrength(exact)?.meetsPolicy).toBe(true)
  })

  it('counts down the characters still needed, so the advice is actionable', () => {
    expect(describePasswordStrength('a'.repeat(MIN_PASSWORD_LENGTH - 3))?.label)
      .toMatch(/3 more characters/)
  })

  it('uses the singular when one character is missing', () => {
    expect(describePasswordStrength(short)?.label).toMatch(/1 more character\b/)
  })

  // The whole point: the validator enforces length and a breach check, and
  // nothing else. A meter that scores character classes tells someone their
  // password is weak for failing a rule that does not exist.
  it('does not penalise a password for lacking digits or symbols', () => {
    const letters = describePasswordStrength('abcdefghijklmnop')
    const mixed = describePasswordStrength('abcdefghijklmno1')

    expect(letters?.meetsPolicy).toBe(true)
    expect(letters?.percent).toBe(mixed?.percent)
  })

  it('never asks for a character class the server does not require', () => {
    for (const candidate of [short, exact, long, 'Passw0rd!!', '          ']) {
      const label = describePasswordStrength(candidate)?.label ?? ''
      expect(label).not.toMatch(/symbol|uppercase|lowercase|number|digit|special/i)
    }
  })

  it('tracks progress toward the minimum rather than scoring quality', () => {
    const half = describePasswordStrength('a'.repeat(Math.floor(MIN_PASSWORD_LENGTH / 2)))
    expect(half?.percent).toBeGreaterThan(0)
    expect(half?.percent).toBeLessThan(100)
  })

  it('reaches full only for a genuinely long passphrase', () => {
    expect(describePasswordStrength(exact)?.percent).toBeLessThan(100)
    expect(describePasswordStrength(long)?.percent).toBe(100)
  })

  it('frames anything beyond the minimum as advice, not a requirement', () => {
    expect(describePasswordStrength(long)?.label).toMatch(/meets the minimum/i)
  })

  it('stays within 0–100 for any input', () => {
    for (const candidate of ['', 'a', short, exact, long, 'x'.repeat(200)]) {
      const result = describePasswordStrength(candidate)
      if (!result) continue
      expect(result.percent).toBeGreaterThanOrEqual(0)
      expect(result.percent).toBeLessThanOrEqual(100)
    }
  })
})
