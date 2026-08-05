'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getPartnerByCustomerId } from '@/lib/optometristPartners'
import { getAppointmentById } from '@/lib/eyeTestAppointments'
import { createPrescription } from '@/lib/prescriptions'
import { validateOpticalValues, type OpticalValues } from '@/lib/opticalRanges'

export interface WriteRxFormState {
  formError?: string
}

const OPTICAL_FIELDS = [
  'rightSphere', 'rightCylinder', 'rightAxis', 'rightAdd',
  'leftSphere', 'leftCylinder', 'leftAxis', 'leftAdd', 'pupillaryDistance',
] as const

// Returns null for every field the optometrist left blank — not every
// prescription needs every field (e.g. no astigmatism means no cylinder) —
// and null (the parse-failed sentinel) if a field was filled in but isn't a
// valid number, which the caller rejects before it ever reaches range
// validation or the database.
function parseOpticalValues(formData: FormData): { values: OpticalValues } | { error: string } {
  const values: OpticalValues = {}
  for (const field of OPTICAL_FIELDS) {
    const raw = (formData.get(field) as string | null)?.trim()
    if (!raw) continue
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      return { error: `${field} must be a number` }
    }
    values[field] = parsed
  }
  return { values }
}

// ST-023 (C3. Digital Rx Writing Tool — "form rejects out-of-range clinical
// values"). Creates the prescription with status='approved' directly — the
// optometrist wrote it themselves during the customer's own booked
// appointment, so there's no separate review queue to route it through.
export async function writePrescriptionAction(formData: FormData): Promise<WriteRxFormState> {
  const session = getSession()
  if (!session) return { formError: 'You must be logged in' }

  const partner = await getPartnerByCustomerId(session.customerId)
  if (!partner || partner.kycStatus !== 'verified') {
    return { formError: 'Your account is not yet verified to write prescriptions' }
  }

  const appointmentId = formData.get('appointmentId') as string
  const appointment = await getAppointmentById(appointmentId)
  if (!appointment || appointment.optometristId !== session.customerId) {
    return { formError: 'Appointment not found' }
  }

  const parsed = parseOpticalValues(formData)
  if ('error' in parsed) return { formError: parsed.error }

  const { valid, errors } = validateOpticalValues(parsed.values)
  if (!valid) return { formError: errors.join('. ') }

  await createPrescription({
    customerId: appointment.customerId,
    fileUrl: null,
    // Booking the appointment is what the customer actually consented to —
    // there is no separate "review my clinical data" consent step the way
    // there is for a customer-initiated file upload.
    consentGivenAt: appointment.createdAt,
    status: 'approved',
    ...parsed.values,
  })

  redirect('/partner-portal')
  return {}
}
