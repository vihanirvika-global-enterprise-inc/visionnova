import { getPrescriptionById } from './prescriptions'
import { readPrescriptionFile } from './prescriptionStorage'
import { logPrescriptionAccess } from './prescriptionAccessLogs'
import type { Prescription } from '@/types'

const REVIEWER_ROLES = ['optometrist', 'admin']

export type PrescriptionDenialReason =
  | 'unauthenticated'
  | 'not_found'
  | 'forbidden'
  | 'unreadable'
  | 'audit_failed'

export type PrescriptionAccessResult =
  | { ok: true; prescription: Prescription; file: Buffer }
  | { ok: false; reason: PrescriptionDenialReason }

interface Session {
  customerId: string
  role: string
}

// The single door to prescription bytes. Authorisation and the access audit are
// both enforced here, so no caller can read a file without being checked and
// without leaving a log entry — the guarantee is structural rather than a rule
// each call site has to remember.
export async function readPrescriptionForSession(
  prescriptionId: string,
  session: Session | null
): Promise<PrescriptionAccessResult> {
  if (!session) return { ok: false, reason: 'unauthenticated' }

  const prescription = await getPrescriptionById(prescriptionId)
  if (!prescription) return { ok: false, reason: 'not_found' }

  const isOwner = prescription.customerId === session.customerId
  const isReviewer = REVIEWER_ROLES.includes(session.role)
  if (!isOwner && !isReviewer) return { ok: false, reason: 'forbidden' }

  let file: Buffer
  try {
    file = await readPrescriptionFile(prescription.fileUrl)
  } catch {
    return { ok: false, reason: 'unreadable' }
  }

  // Fail closed: "every access is logged" is a compliance requirement, so an
  // unwritable audit trail must deny the read rather than allow an unlogged one.
  try {
    await logPrescriptionAccess({
      prescriptionId: prescription.id,
      accessorId: session.customerId,
      accessorRole: session.role,
    })
  } catch {
    return { ok: false, reason: 'audit_failed' }
  }

  return { ok: true, prescription, file }
}
