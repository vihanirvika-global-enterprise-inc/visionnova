import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as NextNavigation from 'next/navigation'
import * as Session from '@/lib/session'
import * as OptometristPartners from '@/lib/optometristPartners'
import * as EyeTestAppointments from '@/lib/eyeTestAppointments'
import * as Prescriptions from '@/lib/prescriptions'
import { writePrescriptionAction } from './actions'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/optometristPartners', () => ({ getPartnerByCustomerId: vi.fn() }))
vi.mock('@/lib/eyeTestAppointments', () => ({ getAppointmentById: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ createPrescription: vi.fn() }))

const OPTOMETRIST_ID = 'cust-partner-1'
const CUSTOMER_ID = 'cust-patient-1'
const APPOINTMENT_ID = 'appt-1'

function makePartner(overrides: Record<string, unknown> = {}) {
  return {
    id: 'partner-1', customerId: OPTOMETRIST_ID, clinicName: 'Sharma Eye Care',
    kycStatus: 'verified' as const, kycDocumentKey: 'key.pdf', referralCode: 'VN-ABC123',
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

function makeAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: APPOINTMENT_ID, customerId: CUSTOMER_ID, optometristId: OPTOMETRIST_ID,
    scheduledAt: new Date('2026-03-02T10:00:00.000Z'), status: 'scheduled' as const,
    createdAt: new Date(),
    ...overrides,
  }
}

function makeFormData(fields: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('appointmentId', APPOINTMENT_ID)
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v))
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Session.getSession).mockReturnValue({ customerId: OPTOMETRIST_ID, role: 'partner_optometrist' })
  vi.mocked(OptometristPartners.getPartnerByCustomerId).mockResolvedValue(makePartner())
  vi.mocked(EyeTestAppointments.getAppointmentById).mockResolvedValue(makeAppointment())
})

describe('writePrescriptionAction', () => {
  it('returns an error when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    const result = await writePrescriptionAction(makeFormData())

    expect(result).toEqual({ formError: expect.any(String) })
    expect(Prescriptions.createPrescription).not.toHaveBeenCalled()
  })

  it('returns an error when KYC is not verified', async () => {
    vi.mocked(OptometristPartners.getPartnerByCustomerId).mockResolvedValue(makePartner({ kycStatus: 'pending' }))

    const result = await writePrescriptionAction(makeFormData())

    expect(result).toEqual({ formError: expect.any(String) })
    expect(Prescriptions.createPrescription).not.toHaveBeenCalled()
  })

  it("returns an error when the appointment does not belong to this optometrist", async () => {
    vi.mocked(EyeTestAppointments.getAppointmentById).mockResolvedValue(
      makeAppointment({ optometristId: 'someone-else' })
    )

    const result = await writePrescriptionAction(makeFormData())

    expect(result).toEqual({ formError: expect.any(String) })
    expect(Prescriptions.createPrescription).not.toHaveBeenCalled()
  })

  it('returns an error when the appointment does not exist', async () => {
    vi.mocked(EyeTestAppointments.getAppointmentById).mockResolvedValue(null)

    const result = await writePrescriptionAction(makeFormData())

    expect(result).toEqual({ formError: expect.any(String) })
  })

  it('returns a field error for an out-of-range clinical value rather than saving it', async () => {
    const result = await writePrescriptionAction(makeFormData({ rightSphere: '25' }))

    expect(result).toEqual({ formError: expect.stringMatching(/sphere/i) })
    expect(Prescriptions.createPrescription).not.toHaveBeenCalled()
  })

  it('returns a clear error for a non-numeric value rather than silently coercing it', async () => {
    const result = await writePrescriptionAction(makeFormData({ rightSphere: 'not-a-number' }))

    expect(result).toEqual({ formError: expect.any(String) })
    expect(Prescriptions.createPrescription).not.toHaveBeenCalled()
  })

  it('creates an approved, file-less prescription with the entered clinical values and redirects', async () => {
    vi.mocked(Prescriptions.createPrescription).mockResolvedValue({} as any)

    await writePrescriptionAction(makeFormData({
      rightSphere: '-1.50', rightCylinder: '-0.75', rightAxis: '90',
      leftSphere: '-1.25', pupillaryDistance: '62',
    }))

    expect(Prescriptions.createPrescription).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: CUSTOMER_ID,
        fileUrl: null,
        status: 'approved',
        rightSphere: -1.5, rightCylinder: -0.75, rightAxis: 90,
        leftSphere: -1.25, pupillaryDistance: 62,
      })
    )
    expect(NextNavigation.redirect).toHaveBeenCalledWith('/partner-portal')
  })

  // Booking the appointment is what the customer actually consented to —
  // there's no separate "review my clinical data" consent step for a
  // digitally-written Rx the way there is for a customer file upload.
  it('sets consentGivenAt to when the appointment was booked', async () => {
    vi.mocked(Prescriptions.createPrescription).mockResolvedValue({} as any)
    const bookedAt = new Date('2026-02-15T09:00:00.000Z')
    vi.mocked(EyeTestAppointments.getAppointmentById).mockResolvedValue(
      makeAppointment({ createdAt: bookedAt })
    )

    await writePrescriptionAction(makeFormData())

    expect(Prescriptions.createPrescription).toHaveBeenCalledWith(
      expect.objectContaining({ consentGivenAt: bookedAt })
    )
  })
})
