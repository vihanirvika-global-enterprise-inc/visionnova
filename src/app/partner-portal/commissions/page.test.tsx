import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/optometristPartners', () => ({ getPartnerByCustomerId: vi.fn() }))
vi.mock('@/lib/referralCommissions', () => ({ getCommissionLedger: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
}))

const CUSTOMER_ID = 'cust-1'

function makePartner(overrides: Record<string, unknown> = {}) {
  return {
    id: 'partner-1', customerId: CUSTOMER_ID, clinicName: 'Sharma Eye Care',
    kycStatus: 'verified' as const, kycDocumentKey: 'key.pdf', referralCode: 'VN-ABC123',
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

function makeLedgerEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'comm-1', partnerId: 'partner-1', orderId: 'order-1',
    amount: null, status: 'pending' as const, createdAt: new Date('2026-03-01T10:00:00Z'),
    ...overrides,
  }
}

async function setup({
  partner = makePartner() as ReturnType<typeof makePartner> | null,
  ledger = [] as ReturnType<typeof makeLedgerEntry>[],
} = {}) {
  const { getSession } = await import('@/lib/session')
  const { getPartnerByCustomerId } = await import('@/lib/optometristPartners')
  const { getCommissionLedger } = await import('@/lib/referralCommissions')
  vi.mocked(getSession).mockReturnValue({ customerId: CUSTOMER_ID, role: 'partner_optometrist' })
  vi.mocked(getPartnerByCustomerId).mockResolvedValue(partner as never)
  vi.mocked(getCommissionLedger).mockResolvedValue(ledger as never)

  const CommissionsPage = (await import('./page')).default
  render(await CommissionsPage())
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('CommissionsPage — access gate', () => {
  it('redirects to /login when there is no session', async () => {
    const { getSession } = await import('@/lib/session')
    const { redirect } = await import('next/navigation')
    vi.mocked(getSession).mockReturnValue(null)

    const CommissionsPage = (await import('./page')).default
    await expect(CommissionsPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('redirects to onboarding when there is no partner record', async () => {
    const { redirect } = await import('next/navigation')
    await expect(setup({ partner: null })).rejects.toThrow('NEXT_REDIRECT')

    expect(redirect).toHaveBeenCalledWith('/partner-portal/register')
  })
})

describe('CommissionsPage — referral code', () => {
  it('shows the referral code prominently', async () => {
    await setup({ partner: makePartner({ referralCode: 'VN-ABC123' }) })
    expect(screen.getByText('VN-ABC123')).toBeInTheDocument()
  })
})

describe('CommissionsPage — ledger', () => {
  it('shows an honest empty state, not a fabricated total, when the ledger has no entries', async () => {
    await setup({ ledger: [] })

    expect(screen.getByText(/no referral activity/i)).toBeInTheDocument()
  })

  it('lists a ledger entry when one exists', async () => {
    await setup({ ledger: [makeLedgerEntry({ orderId: 'order-42' })] })

    expect(screen.getByText(/order-42/)).toBeInTheDocument()
  })

  // The whole point of the scoping decision: never invent a dollar figure
  // for a commission that hasn't actually been calculated.
  it('shows "not yet calculated" rather than a fabricated amount for a null-amount entry', async () => {
    await setup({ ledger: [makeLedgerEntry({ amount: null })] })

    expect(screen.getByText(/not yet calculated/i)).toBeInTheDocument()
  })

  it('shows a real amount when one has been recorded', async () => {
    await setup({ ledger: [makeLedgerEntry({ amount: 150 })] })

    expect(screen.queryByText(/not yet calculated/i)).not.toBeInTheDocument()
  })
})
