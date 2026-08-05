import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readKycDocumentForSession } from '@/lib/optometristPartners'
import type { PartnerKycDenialReason } from '@/lib/optometristPartners'
import { contentTypeForKey } from '@/lib/prescriptionStorage'

export const dynamic = 'force-dynamic'

const DENIAL_STATUS: Record<PartnerKycDenialReason, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  unreadable: 404,
}

// Thin by design, same reasoning as /api/prescriptions/[id]/file: authorisation
// lives in readKycDocumentForSession, so this route cannot bypass it.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await readKycDocumentForSession(params.id, getSession())

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: DENIAL_STATUS[result.reason] }
    )
  }

  return new NextResponse(new Uint8Array(result.file), {
    status: 200,
    headers: {
      'Content-Type': contentTypeForKey(result.partner.kycDocumentKey),
      'Content-Disposition': `inline; filename="kyc-${result.partner.id}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
