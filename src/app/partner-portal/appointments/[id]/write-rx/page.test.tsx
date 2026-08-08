import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/optometristPartners', () => ({ getPartnerByCustomerId: vi.fn() }))
vi.mock('@/lib/eyeTestAppointments', () => ({ getAppointmentById: vi.fn() }))
vi.mock('@/lib/customers', () => ({ getCustomerById: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
}))
vi.mock('./actions', () => ({ writePrescriptionAction: vi.fn() }))

import { getSession } from '@/lib/session'
import { getPartnerByCustomerId } from '@/lib/optometristPartners'
import { getAppointmentById } from '@/lib/eyeTestAppointments'
import { getCustomerById } from '@/lib/customers'
import { notFound } from 'next/navigation'

const OPTOMETRIST_ID = 'd4e5f6a7-1b2c-4d3e-9f80-a1b2c3d4e5f6'
const APPOINTMENT_ID = '11111111-2222-4333-8444-555555555555'
const PATIENT_ID = '99999999-8888-4777-8666-555555555444'

function makeAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: APPOINTMENT_ID, customerId: PATIENT_ID, optometristId: OPTOMETRIST_ID,
    scheduledAt: new Date('2026-08-10T09:30:00Z'), status: 'confirmed' as const,
    createdAt: new Date('2026-08-01T09:00:00Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.mocked(getSession).mockReturnValue({ customerId: OPTOMETRIST_ID, role: 'partner_optometrist' })
  vi.mocked(getPartnerByCustomerId).mockResolvedValue({
    id: 'p-1', customerId: OPTOMETRIST_ID, clinicName: 'ClearSight', kycStatus: 'verified',
  } as never)
  vi.mocked(getAppointmentById).mockResolvedValue(makeAppointment() as never)
  vi.mocked(getCustomerById).mockResolvedValue({
    id: PATIENT_ID, firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com',
  } as never)
})

async function renderPage(id = APPOINTMENT_ID) {
  const WriteRxPage = (await import('./page')).default
  return render(await WriteRxPage({ params: { id } }))
}

// The page rendered the whole clinical form for any id at all, so an
// optometrist could fill it in completely and only be told "Appointment not
// found" on submit. The action already checked; the page never did.
describe('WriteRxPage — appointment id guard', () => {
  it('404s a non-uuid appointment id without querying', async () => {
    await expect(renderPage('not-a-uuid')).rejects.toThrow('NEXT_NOT_FOUND')

    expect(getAppointmentById).not.toHaveBeenCalled()
    expect(notFound).toHaveBeenCalled()
  })

  it('404s a well-formed id that matches no appointment', async () => {
    vi.mocked(getAppointmentById).mockResolvedValue(null as never)

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  // Same disclosure reasoning as /order/[id]: confirming that someone else's
  // appointment exists is itself a leak.
  it('404s an appointment belonging to a different optometrist', async () => {
    vi.mocked(getAppointmentById).mockResolvedValue(
      makeAppointment({ optometristId: 'ffffffff-0000-4000-8000-000000000000' }) as never
    )

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s when there is no session at all', async () => {
    vi.mocked(getSession).mockReturnValue(null)

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getAppointmentById).not.toHaveBeenCalled()
  })

  it('renders the form for the owning optometrist', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { name: /write prescription/i })).toBeInTheDocument()
  })
})

// A partner mid-KYC could open the form, fill it in and be rejected on
// submit. Saying so up front is the difference between a wasted consultation
// and a clear next step.
describe('WriteRxPage — unverified partner', () => {
  it('explains rather than 404s when KYC is not yet verified', async () => {
    vi.mocked(getPartnerByCustomerId).mockResolvedValue({
      id: 'p-1', customerId: OPTOMETRIST_ID, clinicName: 'ClearSight', kycStatus: 'pending',
    } as never)

    await renderPage()

    expect(screen.getByText(/not yet verified/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save prescription/i })).not.toBeInTheDocument()
  })

  it('404s someone with no partner record at all', async () => {
    vi.mocked(getPartnerByCustomerId).mockResolvedValue(null as never)

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('WriteRxPage — appointment context', () => {
  it('names the patient this prescription is for', async () => {
    await renderPage()

    expect(screen.getByText(/Asha Rao/)).toBeInTheDocument()
  })

  it('shows the appointment date, so the clinician can confirm the right visit', async () => {
    await renderPage()

    expect(screen.getByTestId('appointment-date')).toHaveTextContent(/10\/8\/2026|2026/)
  })

  it('degrades rather than failing when the patient record is gone', async () => {
    vi.mocked(getCustomerById).mockResolvedValue(null as never)

    await renderPage()

    expect(screen.getByRole('heading', { name: /write prescription/i })).toBeInTheDocument()
  })
})

// The hint beside each field comes from the same constants the server
// validates against, so the form cannot advertise a range the action rejects.
describe('WriteRxPage — clinical ranges', () => {
  it('states the accepted sphere range', async () => {
    await renderPage()

    expect(screen.getAllByText(/−20 to 20|-20 to 20/).length).toBeGreaterThan(0)
  })

  it('states the accepted axis range', async () => {
    await renderPage()

    expect(screen.getAllByText(/0 to 180/).length).toBeGreaterThan(0)
  })
})

// The mockup had "I certify this prescription (licence KA-OPT-2024-1187)".
// optometrist_partners stores no licence or council registration number, so
// the certification would be a legal attestation against a number we do not
// hold.
describe('WriteRxPage — ships no unbacked certification', () => {
  it('asks for no licence-stamp certification', async () => {
    const { container } = await renderPage()

    expect(screen.queryByRole('checkbox', { name: /certify/i })).not.toBeInTheDocument()
    expect(container.textContent ?? '').not.toMatch(/licence|license|council reg/i)
  })

  it('shows no notes field, which the prescriptions table cannot store', async () => {
    await renderPage()

    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument()
  })
})
