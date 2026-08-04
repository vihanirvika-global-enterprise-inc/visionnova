'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createAppointment, SlotAlreadyBookedError } from '@/lib/eyeTestAppointments'

// Return type matches reviewPrescription's convention (Promise<void>, always
// redirects) — this is a plain <form action={...}> with no client JS, so a
// returned { error } object (the prescription-upload pattern, which reads
// the result via useTransition) isn't wired up to display anywhere here.
// Failure carries the message back through the redirect URL instead.
export async function bookAppointmentAction(formData: FormData): Promise<void> {
  const session = getSession()
  const optometristId = formData.get('optometristId')
  const scheduledAtRaw = formData.get('scheduledAt')

  if (typeof optometristId !== 'string') {
    redirect('/eye-test')
  }

  if (!session) {
    redirect(`/eye-test?optometrist=${optometristId}&error=${encodeURIComponent('You must be logged in to book an eye test')}`)
  }

  const scheduledAt = typeof scheduledAtRaw === 'string' ? new Date(scheduledAtRaw) : null
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    redirect(`/eye-test?optometrist=${optometristId}&error=${encodeURIComponent('Please choose a time slot')}`)
  }

  try {
    await createAppointment(session.customerId, optometristId, scheduledAt)
  } catch (error) {
    // The slot the customer clicked was generated from a page load a few
    // seconds ago — someone else may have booked it since. That's an
    // expected outcome here, not a server error.
    if (error instanceof SlotAlreadyBookedError) {
      redirect(`/eye-test?optometrist=${optometristId}&error=${encodeURIComponent(error.message)}`)
    }
    throw error
  }

  redirect('/account')
}
