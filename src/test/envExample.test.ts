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

// EP-010 BUG-007: both encryption-at-rest keys silently fall back to a
// hardcoded dev secret when unset (kycStorage.ts, prescriptionStorage.ts) —
// undocumented here, a deployer had no signal to set a real one, so a
// production deployment could ship encrypting medical/KYC documents with a
// secret published in this repo's own source.
describe('.env.example — encryption-at-rest keys', () => {
  it.each(['KYC_ENCRYPTION_KEY', 'PRESCRIPTION_ENCRYPTION_KEY'])('documents %s', (name) => {
    expect(ENV_EXAMPLE).toMatch(new RegExp(`^${name}=`, 'm'))
  })
})

// EP-010 BUG-001/005/012: the regulatory risk register on /admin/compliance
// reads these — undocumented, nobody would know the flags exist to flip once
// the real business action happens.
describe('.env.example — regulatory risk register flags', () => {
  it.each([
    'REGULATORY_ESTABLISHMENT_REGISTRATION_CONFIRMED_AT',
    'BACKUP_PAYMENT_PROCESSOR_NAME',
    'LICENSED_OPTOMETRIST_COUNT',
  ])('documents %s', (name) => {
    expect(ENV_EXAMPLE).toMatch(new RegExp(`^#? ?${name}=`, 'm'))
  })
})

// Both analytics keys were read by running code and documented nowhere, so a
// deployer had no signal that the trackers existed at all — let alone that
// they now sit behind a consent gate. Same reasoning as the Grievance Officer
// block above.
describe('.env.example — analytics keys', () => {
  it.each(['NEXT_PUBLIC_POSTHOG_KEY', 'NEXT_PUBLIC_GA4_ID'])('documents %s', (name) => {
    expect(ENV_EXAMPLE).toMatch(new RegExp(`^${name}=`, 'm'))
  })

  // Unset must read as "no analytics", not as "misconfigured" — otherwise a
  // deployer sets a key just to silence a perceived error.
  it('says that leaving them unset is a supported state', () => {
    expect(ENV_EXAMPLE).toMatch(/consent-gated|consent banner/i)
    expect(ENV_EXAMPLE).toMatch(/unset is a safe, supported/i)
  })
})
