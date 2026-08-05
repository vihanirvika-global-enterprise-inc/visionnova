import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))
vi.mock('./kycStorage', () => ({ readKycDocument: vi.fn() }))

function row(overrides: Record<string, unknown> = {}) {
  const now = new Date()
  return {
    id: 'partner-1', customer_id: 'cust-1', clinic_name: 'Sharma Eye Care',
    kyc_status: 'pending', kyc_document_key: 'abc123.pdf',
    referral_code: 'VN-ABC123', created_at: now, updated_at: now,
    ...overrides,
  }
}

describe('createOptometristPartner', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts a partner row with pending KYC status and a generated referral code', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    spy.mockResolvedValueOnce([row()])

    const { createOptometristPartner } = await import('./optometristPartners')
    const result = await createOptometristPartner({
      customerId: 'cust-1', clinicName: 'Sharma Eye Care', kycDocumentKey: 'abc123.pdf',
    })

    expect(sql).toHaveBeenCalledOnce()
    expect(result.kycStatus).toBe('pending')
    expect(result.referralCode).toBe('VN-ABC123')

    const params = spy.mock.calls[0].slice(1)
    expect(params).toContain('cust-1')
    expect(params).toContain('Sharma Eye Care')
    expect(params).toContain('abc123.pdf')
  })
})

describe('getPartnerByCustomerId', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns the partner row for a given customer', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([row()])

    const { getPartnerByCustomerId } = await import('./optometristPartners')
    const result = await getPartnerByCustomerId('cust-1')

    expect(result?.clinicName).toBe('Sharma Eye Care')
  })

  it('returns null when the customer has no partner row', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getPartnerByCustomerId } = await import('./optometristPartners')
    expect(await getPartnerByCustomerId('cust-nonexistent')).toBeNull()
  })
})

describe('getPartnerById', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns the partner row by id', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([row()])

    const { getPartnerById } = await import('./optometristPartners')
    expect((await getPartnerById('partner-1'))?.id).toBe('partner-1')
  })
})

describe('listPendingPartners', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns pending partners joined with the owning customer', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([
      { ...row(), customer_name: 'Asha Rao', customer_email: 'asha@example.com' },
    ])

    const { listPendingPartners } = await import('./optometristPartners')
    const result = await listPendingPartners()

    expect(sql).toHaveBeenCalledOnce()
    expect(result[0].customerName).toBe('Asha Rao')
    expect(result[0].customerEmail).toBe('asha@example.com')
  })
})

describe('updateKycStatus', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('updates the KYC status and returns the updated row', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    spy.mockResolvedValueOnce([row({ kyc_status: 'verified' })])

    const { updateKycStatus } = await import('./optometristPartners')
    const result = await updateKycStatus('partner-1', 'verified')

    expect(result.kycStatus).toBe('verified')
    const params = spy.mock.calls[0].slice(1)
    expect(params).toContain('verified')
    expect(params).toContain('partner-1')
  })
})

// ST-021 (admin KYC review). Admin-only — not the "owner or reviewer"
// pattern prescriptions use, since a partner reviewing their own KYC
// submission isn't a requirement here.
describe('readKycDocumentForSession', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('denies an unauthenticated request', async () => {
    const { readKycDocumentForSession } = await import('./optometristPartners')
    const result = await readKycDocumentForSession('partner-1', null)

    expect(result).toEqual({ ok: false, reason: 'unauthenticated' })
  })

  it('denies a non-reviewer role', async () => {
    const { readKycDocumentForSession } = await import('./optometristPartners')
    const result = await readKycDocumentForSession('partner-1', { customerId: 'cust-1', role: 'customer' })

    expect(result).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('denies an unknown partner', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { readKycDocumentForSession } = await import('./optometristPartners')
    const result = await readKycDocumentForSession('partner-1', { customerId: 'admin-1', role: 'admin' })

    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('returns the decrypted file for a reviewer role', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([row()])
    const { readKycDocument } = await import('./kycStorage')
    vi.mocked(readKycDocument).mockResolvedValueOnce(Buffer.from('kyc bytes'))

    const { readKycDocumentForSession } = await import('./optometristPartners')
    const result = await readKycDocumentForSession('partner-1', { customerId: 'admin-1', role: 'admin' })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.file.toString()).toBe('kyc bytes')
  })

  it('denies when the stored document is unreadable rather than crashing', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([row()])
    const { readKycDocument } = await import('./kycStorage')
    vi.mocked(readKycDocument).mockRejectedValueOnce(new Error('ENOENT'))

    const { readKycDocumentForSession } = await import('./optometristPartners')
    const result = await readKycDocumentForSession('partner-1', { customerId: 'admin-1', role: 'admin' })

    expect(result).toEqual({ ok: false, reason: 'unreadable' })
  })
})
