'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { updateKycStatus } from '@/lib/optometristPartners'
import { REVIEWER_ROLES } from '@/lib/prescriptionAccess'
import type { KycStatus } from '@/types'

// ST-021 (C1. Optometrist Onboarding — KYC review). Middleware's /admin
// matcher intercepts this today, but that is a config-line guarantee on the
// decision that verifies a business's compliance documents — only a
// reviewer role may act, regardless of how the request arrived.
export async function reviewPartnerKyc(formData: FormData): Promise<void> {
  const session = getSession()
  if (!session) return redirect('/login')
  if (!REVIEWER_ROLES.includes(session.role)) return redirect('/unauthorized')

  const partnerId = formData.get('partnerId') as string
  const status = formData.get('status') as KycStatus

  await updateKycStatus(partnerId, status)

  redirect('/admin/partners')
}
