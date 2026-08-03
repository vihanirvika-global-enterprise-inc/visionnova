'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { updatePrescriptionStatus, logPrescriptionReviewAction } from '@/lib/prescriptions'
import { REVIEWER_ROLES } from '@/lib/prescriptionAccess'
import type { ReviewStatus, RejectionReason } from '@/types'

export async function reviewPrescription(formData: FormData): Promise<void> {
  const session = getSession()
  if (!session) return redirect('/login')

  // Middleware's /admin matcher intercepts this action today, but that is a
  // config-line guarantee on the decision that approves medical data. Only a
  // clinical reviewer may act, regardless of how the request arrived.
  if (!REVIEWER_ROLES.includes(session.role)) return redirect('/unauthorized')

  const prescriptionId = formData.get('prescriptionId') as string
  const action = formData.get('action') as ReviewStatus
  const rejectionReason = (formData.get('rejectionReason') as RejectionReason) || undefined
  const note = (formData.get('note') as string) || undefined

  await updatePrescriptionStatus(prescriptionId, action)
  await logPrescriptionReviewAction({
    prescriptionId,
    reviewerId: session.customerId,
    action,
    rejectionReason,
    note,
  })

  redirect('/admin/prescriptions')
}
