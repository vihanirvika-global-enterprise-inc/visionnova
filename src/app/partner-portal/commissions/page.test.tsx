import { render, screen, within } from '@testing-library/react'
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
  return render(await CommissionsPage())
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

// Counted from the ledger already loaded. amount is nullable because no
// commission-rate rule exists, so a row can be recorded before anyone can say
// what it is worth — the summary says how many, rather than totalling a null
// as zero.
describe('CommissionsPage — ledger summary', () => {
  it('splits pending from reconciled', async () => {
    await setup({
      ledger: [
        makeLedgerEntry({ id: 'c-1', amount: 100, status: 'pending' }),
        makeLedgerEntry({ id: 'c-2', amount: 250, status: 'reconciled' }),
      ],
    })

    const summary = screen.getByRole('region', { name: /summary/i })
    expect(within(summary).getByTestId('summary-pending')).toHaveTextContent('1')
    expect(within(summary).getByTestId('summary-reconciled')).toHaveTextContent('1')
  })

  it('totals only the amounts actually recorded', async () => {
    await setup({
      ledger: [
        makeLedgerEntry({ id: 'c-1', amount: 100, status: 'pending' }),
        makeLedgerEntry({ id: 'c-2', amount: 250, status: 'reconciled' }),
      ],
    })

    const summary = screen.getByRole('region', { name: /summary/i })
    expect(within(summary).getByTestId('summary-total')).toHaveTextContent('350')
  })

  it('says how many rows have no amount yet rather than counting them as zero', async () => {
    await setup({
      ledger: [
        makeLedgerEntry({ id: 'c-1', amount: null, status: 'pending' }),
        makeLedgerEntry({ id: 'c-2', amount: 100, status: 'pending' }),
      ],
    })

    const summary = screen.getByRole('region', { name: /summary/i })
    expect(within(summary).getByText(/1 .*no amount recorded/i)).toBeInTheDocument()
  })

  it('shows no summary at all for an empty ledger, leaving the honest empty state', async () => {
    await setup({ ledger: [] })

    expect(screen.queryByRole('region', { name: /summary/i })).not.toBeInTheDocument()
    expect(screen.getByText(/no referral activity recorded yet/i)).toBeInTheDocument()
  })
})

describe('CommissionsPage — no unbacked payout affordances', () => {
  it('offers no statement download it cannot generate', async () => {
    const { container } = await setup({ ledger: [makeLedgerEntry()] })

    expect(screen.queryByRole('button', { name: /download|statement|export/i })).not.toBeInTheDocument()
    expect(container.querySelector('a[download]')).toBeNull()
  })

  // The mockup showed visionnova.in/r/DRMEERA with a copy button. The referral
  // code is real; that route is not, so the link would 404.
  it('shows the referral code but no referral URL that has no route', async () => {
    const { container } = await setup({ ledger: [] })

    expect(container.textContent ?? '').not.toMatch(/visionnova\.in\/r\/|\/r\//)
    expect(container.querySelector('a[href^="/r/"]')).toBeNull()
  })

  it('promises no payout date or schedule', async () => {
    const { container } = await setup({ ledger: [makeLedgerEntry()] })

    expect(container.textContent ?? '').not.toMatch(/paid monthly|payout on|next payout/i)
  })
})
