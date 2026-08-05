import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Prescription events were removed from the client analytics path rather than
// consent-gated. Sensitive personal data under the DPDP Act needs strict
// necessity for a stated purpose, and "product analytics" is not one; consumer
// PostHog and GA4 also carry no DPA suitable for health data. The same
// insight is available from the prescriptions table, which the application
// already owns.
//
// These assertions are deliberately grep-shaped rather than type-shaped: the
// risk is a call site being reintroduced somewhere in the tree, and a type
// test would not see that.

const REMOVED_EVENTS = ['prescription_uploaded', 'prescription_approved', 'prescription_rejected']

const SRC = join(process.cwd(), 'src')

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      sourceFiles(full, acc)
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      acc.push(full)
    }
  }
  return acc
}

describe('client analytics carries no prescription (health) events', () => {
  it.each(REMOVED_EVENTS)('%s is not a member of the AnalyticsEvent union', (event) => {
    const union = readFileSync(join(SRC, 'types', 'analytics.ts'), 'utf8')

    expect(union).not.toContain(event)
  })

  it.each(REMOVED_EVENTS)('%s has no capture site anywhere in non-test source', (event) => {
    const offenders = sourceFiles(SRC).filter((file) => readFileSync(file, 'utf8').includes(event))

    expect(offenders).toEqual([])
  })

  // The point is the health data, not the mechanism: commerce events are
  // still captured, so this must not read as "analytics were switched off".
  it('still carries the commerce events', () => {
    const union = readFileSync(join(SRC, 'types', 'analytics.ts'), 'utf8')

    for (const event of ['add_to_cart', 'checkout_started', 'order_completed']) {
      expect(union).toContain(event)
    }
  })
})
