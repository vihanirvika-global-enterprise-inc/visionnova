import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ENV_EXAMPLE = readFileSync(join(process.cwd(), '.env.example'), 'utf8')

// The Grievance Officer contact is a DPDP requirement (Footer.tsx), but none
// of its three env vars were documented in .env.example — every other
// required integration is. A deployer following the template had no signal
// these needed to be set, so the statutory contact point silently rendered
// "not configured" in practice. This pins the fix the same way
// decorativeSvgs.test.ts pins a static-file convention rather than runtime
// behavior.
describe('.env.example — Grievance Officer contact', () => {
  it.each([
    'GRIEVANCE_OFFICER_NAME',
    'GRIEVANCE_OFFICER_EMAIL',
    'GRIEVANCE_OFFICER_PHONE',
  ])('documents %s', (name) => {
    expect(ENV_EXAMPLE).toMatch(new RegExp(`^${name}=`, 'm'))
  })

  it('flags the block as DPDP-required, not just another optional integration', () => {
    expect(ENV_EXAMPLE).toMatch(/DPDP/)
  })
})
