import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as NextNavigation from 'next/navigation'
import * as Session from '@/lib/session'
import * as OptometristPartners from '@/lib/optometristPartners'
import { reviewPartnerKyc } from './actions'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/optometristPartners', () => ({ updateKycStatus: vi.fn() }))

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Session.getSession).mockReturnValue({ customerId: 'admin-1', role: 'admin' })
})

describe('reviewPartnerKyc', () => {
  it('redirects to /login when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    await reviewPartnerKyc(makeFormData({ partnerId: 'partner-1', status: 'verified' }))

    expect(NextNavigation.redirect).toHaveBeenCalledWith('/login')
    expect(OptometristPartners.updateKycStatus).not.toHaveBeenCalled()
  })

  it('redirects to /unauthorized for a non-reviewer role', async () => {
    vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-1', role: 'customer' })

    await reviewPartnerKyc(makeFormData({ partnerId: 'partner-1', status: 'verified' }))

    expect(NextNavigation.redirect).toHaveBeenCalledWith('/unauthorized')
    expect(OptometristPartners.updateKycStatus).not.toHaveBeenCalled()
  })

  it('updates the KYC status and redirects back to the queue', async () => {
    await reviewPartnerKyc(makeFormData({ partnerId: 'partner-1', status: 'verified' }))

    expect(OptometristPartners.updateKycStatus).toHaveBeenCalledWith('partner-1', 'verified')
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/admin/partners')
  })

  it('allows rejecting KYC the same way', async () => {
    await reviewPartnerKyc(makeFormData({ partnerId: 'partner-1', status: 'rejected' }))

    expect(OptometristPartners.updateKycStatus).toHaveBeenCalledWith('partner-1', 'rejected')
  })
})
