import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/optometristPartners', () => ({ getPartnerByCustomerId: vi.fn() }))
vi.mock('@/lib/eyeTestAppointments', () => ({ getAppointmentsByOptometrist: vi.fn() }))
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

function makeAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'appt-1', customerId: 'cust-customer-1', optometristId: CUSTOMER_ID,
    scheduledAt: new Date('2026-03-02T10:00:00.000Z'), status: 'scheduled' as const,
    createdAt: new Date(), customerName: 'Asha Rao',
    ...overrides,
  }
}

async function setup({
  partner = makePartner() as ReturnType<typeof makePartner> | null,
  queue = [] as ReturnType<typeof makeAppointment>[],
} = {}) {
  const { getSession } = await import('@/lib/session')
  const { getPartnerByCustomerId } = await import('@/lib/optometristPartners')
  const { getAppointmentsByOptometrist } = await import('@/lib/eyeTestAppointments')
  vi.mocked(getSession).mockReturnValue({ customerId: CUSTOMER_ID, role: 'partner_optometrist' })
  // mockResolvedValue (persistent default), not -Once: a page path that
  // redirects before reaching one of these calls (e.g. the missing-partner
  // test) would otherwise leave an unconsumed queued value to leak into
  // the next test that does call it.
  vi.mocked(getPartnerByCustomerId).mockResolvedValue(partner as never)
  vi.mocked(getAppointmentsByOptometrist).mockResolvedValue(queue as never)

  const PartnerDashboardPage = (await import('./page')).default
  return render(await PartnerDashboardPage())
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('PartnerDashboardPage — access gate', () => {
  it('redirects to /login when there is no session', async () => {
    const { getSession } = await import('@/lib/session')
    const { redirect } = await import('next/navigation')
    vi.mocked(getSession).mockReturnValue(null)

    const PartnerDashboardPage = (await import('./page')).default
    await expect(PartnerDashboardPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('redirects to onboarding when the session role has no partner record', async () => {
    const { redirect } = await import('next/navigation')
    await expect(setup({ partner: null })).rejects.toThrow('NEXT_REDIRECT')

    expect(redirect).toHaveBeenCalledWith('/partner-portal/register')
  })
})

describe('PartnerDashboardPage — KYC status', () => {
  it('shows a pending-review notice when KYC is pending', async () => {
    await setup({ partner: makePartner({ kycStatus: 'pending' }) })
    expect(screen.getByText(/pending review/i)).toBeInTheDocument()
  })

  it('shows a rejected notice when KYC was rejected', async () => {
    await setup({ partner: makePartner({ kycStatus: 'rejected' }) })
    expect(screen.getByText(/rejected/i)).toBeInTheDocument()
  })

  it('shows no KYC notice once verified', async () => {
    await setup({ partner: makePartner({ kycStatus: 'verified' }) })
    expect(screen.queryByText(/pending review/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/was rejected/i)).not.toBeInTheDocument()
  })
})

describe('PartnerDashboardPage — booking queue', () => {
  it('shows the clinic name and referral code', async () => {
    await setup({ partner: makePartner({ clinicName: 'Sharma Eye Care', referralCode: 'VN-ABC123' }) })
    expect(screen.getByText('Sharma Eye Care')).toBeInTheDocument()
    expect(screen.getByText('VN-ABC123')).toBeInTheDocument()
  })

  it('shows an empty state when there are no upcoming appointments', async () => {
    await setup({ queue: [] })
    expect(screen.getByText(/no upcoming appointments/i)).toBeInTheDocument()
  })

  it("lists the optometrist's upcoming appointments with the customer name and time", async () => {
    await setup({ queue: [makeAppointment({ customerName: 'Asha Rao' })] })
    expect(screen.getByText('Asha Rao')).toBeInTheDocument()
  })

  it('offers a Write Prescription link for a scheduled appointment when KYC is verified', async () => {
    await setup({
      partner: makePartner({ kycStatus: 'verified' }),
      queue: [makeAppointment({ id: 'appt-1' })],
    })
    expect(screen.getByRole('link', { name: /write prescription/i })).toHaveAttribute(
      'href', '/partner-portal/appointments/appt-1/write-rx'
    )
  })

  it('does not offer Write Prescription when KYC is not verified', async () => {
    await setup({
      partner: makePartner({ kycStatus: 'pending' }),
      queue: [makeAppointment({ id: 'appt-1' })],
    })
    expect(screen.queryByRole('link', { name: /write prescription/i })).not.toBeInTheDocument()
  })

  it('links to the commission tracker', async () => {
    await setup()
    expect(screen.getByRole('link', { name: /referral.*commission/i })).toHaveAttribute(
      'href', '/partner-portal/commissions'
    )
  })
})

// Counted from the queue that is already loaded — no new query, no new claim.
// The mockup's tiles ("Referred customers 148", "Rx written 96",
// "Conversion 64%") have no source and are asserted absent below.
describe('PartnerDashboardPage — appointment summary', () => {
  it('counts today separately from later appointments', async () => {
    const now = new Date()
    const laterToday = new Date(now.getTime() + 2 * 3_600_000)
    const tomorrow = new Date(now.getTime() + 26 * 3_600_000)

    await setup({
      queue: [
        makeAppointment({ id: 'a-1', scheduledAt: laterToday }),
        makeAppointment({ id: 'a-2', scheduledAt: tomorrow }),
      ],
    })

    const summary = screen.getByRole('region', { name: /at a glance/i })
    expect(within(summary).getByTestId('summary-today')).toHaveTextContent('1')
    expect(within(summary).getByTestId('summary-upcoming')).toHaveTextContent('1')
  })

  it('shows zeroes rather than hiding the summary on an empty queue', async () => {
    await setup({ queue: [] })

    const summary = screen.getByRole('region', { name: /at a glance/i })
    expect(within(summary).getByTestId('summary-today')).toHaveTextContent('0')
  })

  it('counts completed appointments, which the queue itself filters out', async () => {
    await setup({
      queue: [makeAppointment({ id: 'a-3', status: 'completed' })],
    })

    const summary = screen.getByRole('region', { name: /at a glance/i })
    expect(within(summary).getByTestId('summary-completed')).toHaveTextContent('1')
  })
})

// Every one of these needs data nothing in this app records.
describe('PartnerDashboardPage — ships no fabricated performance figures', () => {
  it('states no referred-customer count, Rx-written count or conversion rate', async () => {
    const { container } = await setup({ queue: [makeAppointment()] })
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/referred customers|rx written|conversion/i)
  })

  it('states no commission figure on the dashboard', async () => {
    const { container } = await setup({ queue: [] })

    // The ledger lives on /partner-portal/commissions and is honest about
    // being empty. A headline number here would imply earnings exist.
    expect(container.textContent ?? '').not.toMatch(/₹[\d,]+/)
  })

  it('makes no claim about this month or a delta', async () => {
    const { container } = await setup({ queue: [] })

    expect(container.textContent ?? '').not.toMatch(/this month|\+\d+ this|vs last/i)
  })
})
