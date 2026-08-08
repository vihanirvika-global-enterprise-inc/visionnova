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

  // Store the document BEFORE creating the account.
  //
  // The other order left a customer row with role=partner_optometrist and no
  // optometrist_partners row whenever storage failed — an account that can log
  // in, gets bounced from /partner-portal back here, and then fails
  // re-registration on its own duplicate email. Permanently stuck, with no
  // route out that the UI offers.
  //
  // KYC_ENCRYPTION_KEY is unset and on the P0 list. requiredSecret falls back
  // outside production, so this throws on a real deploy at first upload rather
  // than at boot — exactly the case this ordering protects against. The
  // trade is an unreferenced encrypted file if the email turns out to be a
  // duplicate: a stray file is cleanable, a half-created partner is not.
  let kycDocumentKey: string
  try {
    const bytes = await kycFile.arrayBuffer()
    kycDocumentKey = await saveKycDocument(Buffer.from(bytes), kycFile.name)
  } catch {
    // Deliberately says nothing about why. The applicant cannot act on a
    // missing environment variable, and naming it would tell anyone who
    // submits a form which secret is absent.
    return {
      formError:
        'We could not store your KYC document. Please try again, or email support@visionnova.com if it keeps happening.',
    }
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

  await createOptometristPartner({
    customerId: customer.id,
    clinicName,
    kycDocumentKey,
  })

  createSession(customer.id, customer.role)
  redirect('/partner-portal')
}
