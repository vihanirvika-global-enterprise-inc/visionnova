'use server'

import { redirect } from 'next/navigation'
import { createPrescription } from '@/lib/prescriptions'
import { savePrescriptionFile } from '@/lib/prescriptionStorage'
import { getSession } from '@/lib/session'

export async function uploadPrescriptionAction(
  formData: FormData
): Promise<{ error: string } | never> {
  const session = getSession()
  if (!session) return { error: 'You must be logged in to upload a prescription' }

  const file = formData.get('prescription')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Please select a file to upload' }
  }

  const bytes = await file.arrayBuffer()

  // Stores an opaque key, not a public path: the file is served only through
  // /api/prescriptions/[id]/file after a session check.
  const storageKey = await savePrescriptionFile(Buffer.from(bytes), file.name)

  await createPrescription({
    customerId: session.customerId,
    fileUrl: storageKey,
  })

  redirect('/account')
}
