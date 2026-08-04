'use server'

import { redirect } from 'next/navigation'
import { registerUser, DuplicateEmailError } from '@/lib/auth'
import { validateRegistration } from '@/lib/validation'
import { saveKycDocument } from '@/lib/kycStorage'
import { createOptometristPartner } from '@/lib/optometristPartners'
import { createSession } from '@/lib/session'
import type { AuthFormState } from '@/lib/authFormState'

// ST-021 (C1. Optometrist Onboarding — "KYC documents encrypted at rest.
// Verified..."). registerUser creates the account with
// role='partner_optometrist' directly — never as 'customer' upgraded later.
export async function partnerOnboardingAction(formData: FormData): Promise<AuthFormState | never> {
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const clinicName = (formData.get('clinicName') as string | null)?.trim() ?? ''

  const { valid, fieldErrors } = await validateRegistration({ firstName, lastName, email, password })
  if (!valid) return { fieldErrors }

  if (!clinicName) {
    return { fieldErrors: { clinicName: ['Clinic name is required'] } }
  }

  const kycFile = formData.get('kycDocument')
  if (!(kycFile instanceof File) || kycFile.size === 0) {
    return { formError: 'Please upload a KYC document (business registration or license)' }
  }

  let customer
  try {
    customer = await registerUser({ firstName, lastName, email, password, role: 'partner_optometrist' })
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return { fieldErrors: { email: [error.message] } }
    }
    throw error
  }

  const bytes = await kycFile.arrayBuffer()
  const kycDocumentKey = await saveKycDocument(Buffer.from(bytes), kycFile.name)

  await createOptometristPartner({
    customerId: customer.id,
    clinicName,
    kycDocumentKey,
  })

  createSession(customer.id, customer.role)
  redirect('/partner-portal')
}
