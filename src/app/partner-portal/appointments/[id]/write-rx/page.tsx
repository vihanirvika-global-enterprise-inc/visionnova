import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { isUuid } from '@/lib/uuid'
import { getPartnerByCustomerId } from '@/lib/optometristPartners'
import { getAppointmentById } from '@/lib/eyeTestAppointments'
import { getCustomerById } from '@/lib/customers'
import { WriteRxForm } from './WriteRxForm'

interface WriteRxPageProps {
  params: { id: string }
}

// ST-023 (C3. Digital Rx Writing Tool).
//
// This was a client component that rendered the form for any id at all, so an
// optometrist could complete a whole clinical form and only be told
// "Appointment not found" on submit. writePrescriptionAction has always
// checked ownership; the page never did. It now runs the same checks before
// rendering anything, and every rejection is notFound() rather than a 403 —
// confirming that someone else's appointment exists is itself a disclosure,
// the same reasoning as /order/[id].
//
// Shape is checked before the query because appointments.id is a uuid column:
// a raw string reaches Postgres and throws rather than returning null.
export default async function WriteRxPage({ params }: WriteRxPageProps) {
  const session = getSession()
  if (!session || !isUuid(params.id)) {
    notFound()
  }

  const partner = await getPartnerByCustomerId(session.customerId)
  if (!partner) {
    notFound()
  }

  const appointment = await getAppointmentById(params.id)
  if (!appointment || appointment.optometristId !== session.customerId) {
    notFound()
  }

  // A partner mid-KYC gets an explanation rather than a 404: they are a
  // legitimate holder of this URL, and the action would reject the submission
  // anyway. Saying so before the consultation is written up is the difference
  // between a wasted appointment and a clear next step.
  if (partner.kycStatus !== 'verified') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-dark">Write Prescription</h1>
        <p role="status" className="mt-4 rounded-lg bg-surface px-4 py-3 text-muted">
          Your clinic is not yet verified, so prescriptions cannot be written from
          this account. We will email you when verification completes.
        </p>
      </main>
    )
  }

  // Degrades rather than failing: a deleted patient record must not block a
  // clinician from recording a prescription for an appointment that happened.
  const patient = await getCustomerById(appointment.customerId)
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient record unavailable'

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-dark">Write Prescription</h1>
      <p className="mt-2 text-muted">
        Enter clinical values for this appointment. Fields left blank are not recorded.
      </p>

      {/* Context the clinician needs to confirm they are writing against the
          right visit — all read from the appointment, none of it entered. */}
      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 rounded-xl bg-surface p-4 text-sm">
        <div>
          <dt className="text-muted">Patient</dt>
          <dd className="font-medium text-dark">{patientName}</dd>
        </div>
        <div>
          <dt className="text-muted">Appointment</dt>
          <dd data-testid="appointment-date" className="font-medium text-dark">
            {appointment.scheduledAt.toLocaleDateString('en-IN')}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Clinic</dt>
          <dd className="font-medium text-dark">{partner.clinicName}</dd>
        </div>
      </dl>

      <WriteRxForm appointmentId={appointment.id} />
    </main>
  )
}
