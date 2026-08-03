import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { MIN_PASSWORD_LENGTH } from './passwordPolicy'
import { MIN_PASSWORD_LENGTH as VALIDATION_MIN } from './validation'

describe('MIN_PASSWORD_LENGTH', () => {
  it('is the rule the server enforces', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10)
  })

  // validation.ts re-exports it; if the two ever became separate literals the
  // form could advertise one rule while the server enforced another.
  it('is the same value validation.ts validates against', () => {
    expect(VALIDATION_MIN).toBe(MIN_PASSWORD_LENGTH)
  })

  // This module exists specifically so client components can import the rule.
  // validation.ts reaches the database (via ./customers), so importing the
  // constant from there pulled `postgres` into the browser bundle and failed
  // the production build. Keeping this file import-free is the whole point.
  it('has no imports, so it stays safe for client components', () => {
    const source = readFileSync(join(__dirname, 'passwordPolicy.ts'), 'utf8')

    expect(source).not.toMatch(/^\s*import\s/m)
    expect(source).not.toMatch(/require\(/)
  })
})
