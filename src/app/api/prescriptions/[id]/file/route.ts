import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readPrescriptionForSession } from '@/lib/prescriptionAccess'
import type { PrescriptionDenialReason } from '@/lib/prescriptionAccess'
import { contentTypeForKey } from '@/lib/prescriptionStorage'

export const dynamic = 'force-dynamic'

const DENIAL_STATUS: Record<PrescriptionDenialReason, number> = {
  unauthenticated: 401,
  forbidden: 403,
  // A missing file is reported as "not found" so the response never
  // distinguishes an absent record from unreadable storage.
  not_found: 404,
  unreadable: 404,
  audit_failed: 500,
}

// Thin by design: authorisation and the access audit live in
// readPrescriptionForSession, so this route cannot bypass either.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await readPrescriptionForSession(params.id, getSession())

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: DENIAL_STATUS[result.reason] }
    )
  }

  return new NextResponse(new Uint8Array(result.file), {
    status: 200,
    headers: {
      'Content-Type': contentTypeForKey(result.prescription.fileUrl),
      'Content-Disposition': `inline; filename="prescription-${result.prescription.id}"`,
      // Health data must not land in a shared or browser cache.
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
