import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Auth from '@/lib/auth'
import * as Validation from '@/lib/validation'
import * as KycStorage from '@/lib/kycStorage'
import * as OptometristPartners from '@/lib/optometristPartners'
import { partnerOnboardingAction } from './actions'

vi.mock('@/lib/auth', () => ({
  registerUser: vi.fn(),
  // Mirrors the real class's fixed-message constructor (no parameter) so
  // this stays a faithful stand-in, not just a same-named class.
  DuplicateEmailError: class DuplicateEmailError extends Error {
    constructor() { super('Email already registered') }
  },
}))
vi.mock('@/lib/validation', () => ({ validateRegistration: vi.fn() }))
vi.mock('@/lib/kycStorage', () => ({ saveKycDocument: vi.fn() }))
vi.mock('@/lib/optometristPartners', () => ({ createOptometristPartner: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

let mockSet: ReturnType<typeof vi.fn>
let mockGet: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockSet = vi.fn()
  mockGet = vi.fn()
  mockDelete = vi.fn()
  vi.spyOn(NextHeaders, 'cookies').mockReturnValue(
    { set: mockSet, get: mockGet, delete: mockDelete } as any
  )
  vi.mocked(Validation.validateRegistration).mockResolvedValue({ valid: true, errors: [], fieldErrors: {} })
  vi.mocked(KycStorage.saveKycDocument).mockResolvedValue('generated-key.pdf')
})

afterEach(() => { vi.restoreAllMocks() })

function makeFormData(overrides: Record<string, string> = {}, { withFile = true } = {}): FormData {
  const fd = new FormData()
  fd.set('firstName', 'Priya')
  fd.set('lastName', 'Sharma')
  fd.set('email', 'clinic@example.com')
  fd.set('password', 'correctpass123')
  fd.set('clinicName', 'Sharma Eye Care')
  Object.entries(overrides).forEach(([k, v]) => fd.set(k, v))
  if (withFile) {
    const blob = new Blob(['fake-kyc-bytes'], { type: 'application/pdf' })
    fd.set('kycDocument', new File([blob], 'license.pdf', { type: 'application/pdf' }))
  }
  return fd
}

describe('partnerOnboardingAction', () => {
  it('returns field errors from validateRegistration without creating an account', async () => {
    vi.mocked(Validation.validateRegistration).mockResolvedValue({
      valid: false, errors: ['Invalid email address'], fieldErrors: { email: ['Invalid email address'] },
    })

    const result = await partnerOnboardingAction(makeFormData())

    expect(result).toEqual({ fieldErrors: { email: ['Invalid email address'] } })
    expect(Auth.registerUser).not.toHaveBeenCalled()
  })

  it('returns an error when clinic name is missing', async () => {
    const result = await partnerOnboardingAction(makeFormData({ clinicName: '' }))

    expect(result).toEqual({ fieldErrors: expect.objectContaining({ clinicName: expect.any(Array) }) })
    expect(Auth.registerUser).not.toHaveBeenCalled()
  })

  it('returns an error when no KYC document is uploaded', async () => {
    const result = await partnerOnboardingAction(makeFormData({}, { withFile: false }))

    expect(result).toEqual({ formError: expect.any(String) })
    expect(Auth.registerUser).not.toHaveBeenCalled()
  })

  it('creates the account with role=partner_optometrist, encrypts and stores the KYC document, and creates the partner record', async () => {
    vi.mocked(Auth.registerUser).mockResolvedValue({
      id: 'cust-1', email: 'clinic@example.com', passwordHash: 'hash',
      firstName: 'Priya', lastName: 'Sharma', phone: null, role: 'partner_optometrist',
      createdAt: new Date(), updatedAt: new Date(),
    })
    vi.mocked(OptometristPartners.createOptometristPartner).mockResolvedValue({
      id: 'partner-1', customerId: 'cust-1', clinicName: 'Sharma Eye Care',
      kycStatus: 'pending', kycDocumentKey: 'generated-key.pdf', referralCode: 'VN-ABC123',
      createdAt: new Date(), updatedAt: new Date(),
    })

    await partnerOnboardingAction(makeFormData())

    expect(Auth.registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'clinic@example.com', role: 'partner_optometrist' })
    )
    expect(KycStorage.saveKycDocument).toHaveBeenCalled()
    expect(OptometristPartners.createOptometristPartner).toHaveBeenCalledWith({
      customerId: 'cust-1', clinicName: 'Sharma Eye Care', kycDocumentKey: 'generated-key.pdf',
    })
    expect(mockSet).toHaveBeenCalledWith(
      'session', expect.any(String), expect.objectContaining({ httpOnly: true })
    )
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/partner-portal')
  })

  it('returns a duplicate-email field error rather than crashing', async () => {
    vi.mocked(Auth.registerUser).mockRejectedValue(new Auth.DuplicateEmailError())

    const result = await partnerOnboardingAction(makeFormData())

    expect(result).toEqual({ fieldErrors: { email: [expect.any(String)] } })
    expect(OptometristPartners.createOptometristPartner).not.toHaveBeenCalled()
  })
})

// KYC_ENCRYPTION_KEY is on the env-var P0 list and is unset. requiredSecret
// falls back outside production, so this only bites on a real deploy — where
// saveKycDocument throws at first upload, not at boot.
//
// The order mattered: registerUser ran first, so a storage failure left a
// customer row with role=partner_optometrist and no optometrist_partners row.
// That account could then log in, be bounced from /partner-portal back to
// /register, and fail re-registration on the duplicate email — stuck, with no
// way out that the UI offers.
describe('partnerOnboardingAction — KYC storage failure', () => {
  it('creates no account when the document cannot be stored', async () => {
    vi.mocked(KycStorage.saveKycDocument).mockRejectedValue(
      new Error('KYC_ENCRYPTION_KEY is not set')
    )

    const result = await partnerOnboardingAction(makeFormData())

    expect(Auth.registerUser).not.toHaveBeenCalled()
    expect(OptometristPartners.createOptometristPartner).not.toHaveBeenCalled()
    expect(result?.formError).toMatch(/could not.*(upload|store)|try again/i)
  })

  it('does not leak the underlying secret name to the applicant', async () => {
    vi.mocked(KycStorage.saveKycDocument).mockRejectedValue(
      new Error('KYC_ENCRYPTION_KEY is not set')
    )

    const result = await partnerOnboardingAction(makeFormData())

    expect(result?.formError ?? '').not.toMatch(/KYC_ENCRYPTION_KEY|env/i)
  })

  it('stores the document before creating the account', async () => {
    const order: string[] = []
    vi.mocked(KycStorage.saveKycDocument).mockImplementation(async () => {
      order.push('kyc'); return 'generated-key.pdf'
    })
    vi.mocked(Auth.registerUser).mockImplementation(async () => {
      order.push('account'); return { id: 'cust-1', role: 'partner_optometrist' } as never
    })

    await partnerOnboardingAction(makeFormData()).catch(() => {})

    expect(order).toEqual(['kyc', 'account'])
  })

  // A duplicate email now leaves an unreferenced encrypted file rather than an
  // unusable account. That is the better failure of the two: a stray file is
  // cleanable, a half-created partner locks a real clinic out permanently.
  it('still reports a duplicate email as a field error', async () => {
    vi.mocked(Auth.registerUser).mockRejectedValue(new Auth.DuplicateEmailError())

    const result = await partnerOnboardingAction(makeFormData())

    expect(result?.fieldErrors?.email?.[0]).toMatch(/already registered/i)
    expect(OptometristPartners.createOptometristPartner).not.toHaveBeenCalled()
  })
})
