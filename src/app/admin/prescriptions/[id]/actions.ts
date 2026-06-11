'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { updatePrescriptionStatus, logPrescriptionReviewAction } from '@/lib/prescriptions'
import type { ReviewStatus, RejectionReason } from '@/types'

export async function reviewPrescription(formData: FormData): Promise<void> {
  const session = getSession()
  if (!session) return redirect('/login')

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
