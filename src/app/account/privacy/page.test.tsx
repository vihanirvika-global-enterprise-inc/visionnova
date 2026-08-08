import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/customers', () => ({ getCustomerById: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ getPrescriptionsByCustomer: vi.fn() }))
vi.mock('@/lib/orders', () => ({ getOrdersByCustomer: vi.fn() }))
vi.mock('@/lib/prescriptionAccessLogs', () => ({ getAccessLogsByCustomer: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
}))

const CUSTOMER_ID = 'c1a2b3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

function makeCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: CUSTOMER_ID, email: 'asha@example.com', passwordHash: 'hash',
    firstName: 'Asha', lastName: 'Rao', phone: null, role: 'customer' as const,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

function makePrescription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rx-001', customerId: CUSTOMER_ID, fileUrl: 'key.pdf', status: 'approved' as const,
    consentGivenAt: new Date('2026-02-01T10:00:00Z'),
    rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null,
    leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null,
    pupillaryDistance: null, expiresAt: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

async function setup({
  customer = makeCustomer(),
  prescriptions = [] as ReturnType<typeof makePrescription>[],
  orders = [] as unknown[],
  accessLogs = [] as unknown[],
} = {}) {
  const { getSession } = await import('@/lib/session')
  const { getCustomerById } = await import('@/lib/customers')
  const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
  const { getOrdersByCustomer } = await import('@/lib/orders')
  vi.mocked(getSession).mockReturnValue({ customerId: CUSTOMER_ID, role: 'customer' })
  vi.mocked(getCustomerById).mockResolvedValueOnce(customer as never)
  vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce(prescriptions as never)
  vi.mocked(getOrdersByCustomer).mockResolvedValueOnce(orders as never)
  const { getAccessLogsByCustomer } = await import('@/lib/prescriptionAccessLogs')
  vi.mocked(getAccessLogsByCustomer).mockResolvedValueOnce(accessLogs as never)

  const PrivacyPage = (await import('./page')).default
  // Imported here rather than at the top of the file: vi.resetModules() runs
  // before each test, so a top-level import would hand this wrapper a
  // different module instance — and therefore a different React context —
  // than the one the page's own import resolves.
  const { CookieConsentProvider } = await import('@/components/consent/CookieConsentProvider')

  // The analytics consent control reads context that the root layout always
  // provides in the real app.
  return render(<CookieConsentProvider>{await PrivacyPage()}</CookieConsentProvider>)
}

const ORIGINAL_ENV = process.env

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  process.env = { ...ORIGINAL_ENV }
})

describe('PrivacyPage — access gate', () => {
  it('redirects to /login when there is no session', async () => {
    const { getSession } = await import('@/lib/session')
    const { redirect } = await import('next/navigation')
    vi.mocked(getSession).mockReturnValue(null)

    const PrivacyPage = (await import('./page')).default
    await expect(PrivacyPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/login')
  })
})

describe('PrivacyPage — data summary', () => {
  it("shows the customer's own email and record counts", async () => {
    await setup({
      customer: makeCustomer({ email: 'asha@example.com' }),
      prescriptions: [makePrescription()],
      orders: [{}, {}],
    })

    expect(screen.getByText('asha@example.com')).toBeInTheDocument()
    expect(screen.getByText(/1 prescription/i)).toBeInTheDocument()
    expect(screen.getByText(/2 orders/i)).toBeInTheDocument()
  })
})

describe('PrivacyPage — consent status', () => {
  it('shows when consent was given for a prescription', async () => {
    await setup({
      prescriptions: [makePrescription({ id: 'rx-001', consentGivenAt: new Date('2026-02-01T10:00:00Z') })],
    })

    expect(screen.getByTestId('consent-status-rx-001')).toHaveTextContent(/2026/)
  })

  // Prescriptions uploaded before consent capture existed have no
  // consentGivenAt — must say so honestly, not fabricate a date.
  it('says consent predates capture for a prescription with no consentGivenAt', async () => {
    await setup({
      prescriptions: [makePrescription({ id: 'rx-002', consentGivenAt: null })],
    })

    expect(screen.getByTestId('consent-status-rx-002')).toHaveTextContent(/predates|not recorded/i)
  })
})

describe('PrivacyPage — data subject rights', () => {
  it('offers a data access/export request via email', async () => {
    await setup()

    const link = screen.getByRole('link', { name: /request.*data|export/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:support@visionnova.com'))
  })

  it('offers a correction/erasure request via email', async () => {
    await setup()

    const link = screen.getByRole('link', { name: /delete|erasure|correct/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:support@visionnova.com'))
  })

  it('offers a consent withdrawal request via email', async () => {
    await setup({ prescriptions: [makePrescription()] })

    const link = screen.getByRole('link', { name: /withdraw consent/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:support@visionnova.com'))
  })
})

describe('PrivacyPage — Grievance Officer', () => {
  it('shows the configured Grievance Officer contact', async () => {
    process.env.GRIEVANCE_OFFICER_NAME = 'Priya Sharma'
    process.env.GRIEVANCE_OFFICER_EMAIL = 'grievance@visionnova.com'

    await setup()

    expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'grievance@visionnova.com' })).toHaveAttribute(
      'href', 'mailto:grievance@visionnova.com'
    )
  })

  it('shows a loud alert, not silence, when the Grievance Officer is unconfigured', async () => {
    delete process.env.GRIEVANCE_OFFICER_NAME
    delete process.env.GRIEVANCE_OFFICER_EMAIL

    await setup()

    expect(screen.getByRole('alert')).toHaveTextContent(/grievance officer/i)
  })
})

function makeAccessLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'log-001', prescriptionId: 'rx-001', accessorId: 'acc-001',
    accessorName: 'Dr Meera Nair', accessorRole: 'optometrist',
    accessType: 'file' as const, accessedAt: new Date('2026-08-01T10:30:00Z'),
    ...overrides,
  }
}

// DPDP gives a data principal the right to know who has processed their data.
// prescription_access_logs has recorded exactly that all along; nothing
// surfaced it to the person it is about.
describe('PrivacyPage — who has accessed your data', () => {
  it('names the person who read a prescription, and when', async () => {
    await setup({ accessLogs: [makeAccessLog()] })

    const section = screen.getByRole('region', { name: /who has accessed/i })
    expect(within(section).getByText(/Dr Meera Nair/)).toBeInTheDocument()
    expect(within(section).getByText(/optometrist/i)).toBeInTheDocument()
  })

  it('distinguishes a file read from a metadata read', async () => {
    await setup({
      accessLogs: [
        makeAccessLog({ id: 'l1', accessType: 'file' }),
        makeAccessLog({ id: 'l2', accessType: 'metadata', accessorName: 'Ops Priya' }),
      ],
    })

    const section = screen.getByRole('region', { name: /who has accessed/i })
    expect(within(section).getByText(/prescription file/i)).toBeInTheDocument()
    expect(within(section).getByText(/prescription details/i)).toBeInTheDocument()
  })

  it('says plainly that nobody has accessed it, rather than hiding the section', async () => {
    await setup({ accessLogs: [] })

    const section = screen.getByRole('region', { name: /who has accessed/i })
    expect(within(section).getByText(/no one has accessed/i)).toBeInTheDocument()
  })

  it('scopes the query to the signed-in customer', async () => {
    const { getAccessLogsByCustomer } = await import('@/lib/prescriptionAccessLogs')
    await setup({ accessLogs: [] })

    expect(getAccessLogsByCustomer).toHaveBeenCalledWith(CUSTOMER_ID)
  })
})

describe('PrivacyPage — consent history', () => {
  it('lists when consent was given, from the real consent timestamp', async () => {
    await setup({
      prescriptions: [makePrescription({ consentGivenAt: new Date('2026-02-01T10:00:00Z') })],
    })

    const section = screen.getByRole('region', { name: /consent history/i })
    expect(within(section).getByText(/1\/2\/2026|01\/02\/2026/)).toBeInTheDocument()
  })

  // Rows uploaded before consent capture existed have no timestamp. Showing
  // "consented" for them would be a fabricated legal record.
  it('does not claim consent for a record that predates consent capture', async () => {
    await setup({ prescriptions: [makePrescription({ consentGivenAt: null })] })

    const section = screen.getByRole('region', { name: /consent history/i })
    expect(within(section).getByText(/not recorded/i)).toBeInTheDocument()
  })

  it('says so when there is no consent history at all', async () => {
    await setup({ prescriptions: [] })

    const section = screen.getByRole('region', { name: /consent history/i })
    expect(within(section).getByText(/no consent events/i)).toBeInTheDocument()
  })
})

describe('PrivacyPage — cookie preferences', () => {
  it('offers the analytics toggle, which is genuinely self-service', async () => {
    await setup()

    const section = screen.getByRole('region', { name: /cookie preferences/i })
    // The section names analytics in its copy and again in the control's own
    // status line, so target the control by its testid rather than by text.
    expect(within(section).getByTestId('analytics-consent-status')).toBeInTheDocument()
  })

  // The mockup had four toggles. Only analytics has a consent mechanism
  // behind it; marketing and personalisation set nothing anywhere.
  it('offers no toggle for a cookie category that does not exist', async () => {
    await setup()

    const section = screen.getByRole('region', { name: /cookie preferences/i })
    expect(within(section).queryByText(/marketing/i)).not.toBeInTheDocument()
    expect(within(section).queryByText(/personalisation|personalization/i)).not.toBeInTheDocument()
  })
})

// /privacy is still a 404 — a separate P0. Linking to it from the rights
// centre would send someone exercising a statutory right to a dead page.
describe('PrivacyPage — links only where something exists', () => {
  it('does not link to the public privacy policy that has no route', async () => {
    const { container } = await setup()

    expect(container.querySelector('a[href="/privacy"]')).toBeNull()
    expect(container.querySelector('a[href^="/privacy"]')).toBeNull()
  })

  it('offers no download or export button it cannot fulfil', async () => {
    const { container } = await setup()

    // Requests go by email, matching every other rights flow in this app.
    expect(screen.queryByRole('button', { name: /download|export/i })).not.toBeInTheDocument()
    expect(container.querySelector('a[download]')).toBeNull()
  })
})

describe('PrivacyPage — session guard', () => {
  it('redirects a session carrying a non-uuid customer id', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockReturnValue({ customerId: 'not-a-uuid', role: 'customer' })
    const { getAccessLogsByCustomer } = await import('@/lib/prescriptionAccessLogs')
    const PrivacyPage = (await import('./page')).default

    await expect(PrivacyPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(getAccessLogsByCustomer).not.toHaveBeenCalled()
  })
})
