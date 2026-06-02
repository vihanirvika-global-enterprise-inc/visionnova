'use server'

import * as fsPromises from 'fs/promises'
import { join } from 'path'
import { redirect } from 'next/navigation'
import { createPrescription } from '@/lib/prescriptions'
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
  const filename = `${Date.now()}-${file.name}`
  const uploadPath = join(process.cwd(), 'public', 'uploads', filename)
  await fsPromises.writeFile(uploadPath, Buffer.from(bytes))

  await createPrescription({
    customerId: session.customerId,
    fileUrl: `/uploads/${filename}`,
  })

  redirect('/account')
}
