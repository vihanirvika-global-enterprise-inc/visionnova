import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getPrescriptionById } from '@/lib/prescriptions'
import { readPrescriptionFile, contentTypeForKey } from '@/lib/prescriptionStorage'

export const dynamic = 'force-dynamic'

const REVIEWER_ROLES = ['optometrist', 'admin']

// The only route that can return prescription bytes. Files live outside public/
// precisely so this check cannot be bypassed.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession()
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const prescription = await getPrescriptionById(params.id)
  if (!prescription) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isOwner = prescription.customerId === session.customerId
  const isReviewer = REVIEWER_ROLES.includes(session.role)
  if (!isOwner && !isReviewer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let file: Buffer
  try {
    file = await readPrescriptionFile(prescription.fileUrl)
  } catch {
    // Missing or unreadable on disk. Do not distinguish it from "no such
    // prescription" — and never surface the storage path.
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(file), {
    status: 200,
    headers: {
      'Content-Type': contentTypeForKey(prescription.fileUrl),
      'Content-Disposition': `inline; filename="prescription-${prescription.id}"`,
      // Health data must not land in a shared or browser cache.
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
