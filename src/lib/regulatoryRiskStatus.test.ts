import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getRegulatoryRiskStatus } from './regulatoryRiskStatus'

const ENV_KEYS = [
  'REGULATORY_ESTABLISHMENT_REGISTRATION_CONFIRMED_AT',
  'BACKUP_PAYMENT_PROCESSOR_NAME',
  'LICENSED_OPTOMETRIST_COUNT',
] as const

const original: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    original[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key]
    else process.env[key] = original[key]
  }
})

// EP-010 BUG-001/005/012: these three risk-register items are not software
// tasks — they're a regulatory filing, a vendor contract, and a hiring
// decision. This module can't perform any of them; it can only make it
// impossible to miss that they're still outstanding, the same principle as
// the Grievance Officer contact status.
describe('getRegulatoryRiskStatus', () => {
  it('reports all three items as unconfigured when nothing is set', () => {
    const items = getRegulatoryRiskStatus()

    expect(items).toHaveLength(3)
    expect(items.every((item) => item.configured === false)).toBe(true)
  })

  it('reports the regulatory establishment registration as configured once a confirmation date is set', () => {
    process.env.REGULATORY_ESTABLISHMENT_REGISTRATION_CONFIRMED_AT = '2026-08-01'

    const item = getRegulatoryRiskStatus().find((i) => i.id === 'regulatory-establishment-registration')

    expect(item?.configured).toBe(true)
    expect(item?.detail).toContain('2026-08-01')
    expect(item?.riskRef).toBe('R-01 / REG-01')
  })

  it('reports the backup payment processor as configured once a vendor name is set', () => {
    process.env.BACKUP_PAYMENT_PROCESSOR_NAME = 'Cashfree'

    const item = getRegulatoryRiskStatus().find((i) => i.id === 'backup-payment-processor')

    expect(item?.configured).toBe(true)
    expect(item?.detail).toContain('Cashfree')
    expect(item?.riskRef).toBe('TECH-01 / FIN-04')
  })

  it('reports optometrist staffing as unconfigured with fewer than two on record', () => {
    process.env.LICENSED_OPTOMETRIST_COUNT = '1'

    const item = getRegulatoryRiskStatus().find((i) => i.id === 'optometrist-staffing-redundancy')

    expect(item?.configured).toBe(false)
    expect(item?.riskRef).toBe('OPS-04 / PEO-02')
  })

  it('reports optometrist staffing as configured once two or more are on record', () => {
    process.env.LICENSED_OPTOMETRIST_COUNT = '2'

    const item = getRegulatoryRiskStatus().find((i) => i.id === 'optometrist-staffing-redundancy')

    expect(item?.configured).toBe(true)
  })

  it('treats a non-numeric optometrist count as zero rather than throwing', () => {
    process.env.LICENSED_OPTOMETRIST_COUNT = 'not-a-number'

    expect(() => getRegulatoryRiskStatus()).not.toThrow()
    const item = getRegulatoryRiskStatus().find((i) => i.id === 'optometrist-staffing-redundancy')
    expect(item?.configured).toBe(false)
  })
})
