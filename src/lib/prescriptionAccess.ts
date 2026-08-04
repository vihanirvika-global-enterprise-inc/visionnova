import { getPrescriptionById } from './prescriptions'
import { readPrescriptionFile } from './prescriptionStorage'
import { logPrescriptionAccess } from './prescriptionAccessLogs'
import type { Prescription, PrescriptionWithCustomer } from '@/types'

// The clinical-review roles. Exported so every gate over prescription data —
// file reads, metadata reads, and the review decision itself — is checked
// against one list rather than a copy per call site. 'ops' is deliberately
// absent: it is an operations role, not a clinical one.
export const REVIEWER_ROLES = ['optometrist', 'admin']

export type PrescriptionDenialReason =
  | 'unauthenticated'
  | 'not_found'
  | 'forbidden'
  | 'unreadable'
  | 'audit_failed'

// fileUrl is narrowed to non-null here: readPrescriptionForSession only ever
// returns ok:true after confirming a file exists (ST-023's digitally-authored
// prescriptions return not_found instead), so callers of the file route
// shouldn't have to re-guard against a case that can't happen.
export type PrescriptionAccessResult =
  | { ok: true; prescription: Omit<Prescription, 'fileUrl'> & { fileUrl: string }; file: Buffer }
  | { ok: false; reason: PrescriptionDenialReason }

export type PrescriptionMetadataResult =
  | { ok: true; prescription: PrescriptionWithCustomer }
  | { ok: false; reason: PrescriptionDenialReason }

interface Session {
  customerId: string
  role: string
}

// Shared by both doors below: resolve the record and confirm the caller may
// see it at all. Returns the denial reason so each caller reports it the same
// way, rather than re-deriving the rules.
async function authorise(
  prescriptionId: string,
  session: Session | null
): Promise<
  | { ok: true; prescription: PrescriptionWithCustomer }
  | { ok: false; reason: PrescriptionDenialReason }
> {
  if (!session) return { ok: false, reason: 'unauthenticated' }

  const prescription = await getPrescriptionById(prescriptionId)
  if (!prescription) return { ok: false, reason: 'not_found' }

  const isOwner = prescription.customerId === session.customerId
  const isReviewer = REVIEWER_ROLES.includes(session.role)
  if (!isOwner && !isReviewer) return { ok: false, reason: 'forbidden' }

  return { ok: true, prescription }
}

// The single door to prescription bytes. Authorisation and the access audit are
// both enforced here, so no caller can read a file without being checked and
// without leaving a log entry — the guarantee is structural rather than a rule
// each call site has to remember.
export async function readPrescriptionForSession(
  prescriptionId: string,
  session: Session | null
): Promise<PrescriptionAccessResult> {
  const authorised = await authorise(prescriptionId, session)
  if (!authorised.ok) return authorised

  const { prescription } = authorised

  // ST-023: a digitally-authored prescription has no uploaded document —
  // there is genuinely nothing to read, not a storage failure.
  if (!prescription.fileUrl) {
    return { ok: false, reason: 'not_found' }
  }
  // Captured into its own binding: TS's narrowing of an object property
  // (prescription.fileUrl) doesn't survive the awaits below, since it can't
  // prove nothing mutated it through a shared reference in the meantime.
  const fileUrl = prescription.fileUrl

  let file: Buffer
  try {
    file = await readPrescriptionFile(fileUrl)
  } catch {
    return { ok: false, reason: 'unreadable' }
  }

  // Fail closed: "every access is logged" is a compliance requirement, so an
  // unwritable audit trail must deny the read rather than allow an unlogged one.
  try {
    await logPrescriptionAccess({
      prescriptionId: prescription.id,
      accessorId: session!.customerId,
      accessorRole: session!.role,
      accessType: 'file',
    })
  } catch {
    return { ok: false, reason: 'audit_failed' }
  }

  return { ok: true, prescription: { ...prescription, fileUrl }, file }
}

// The other door: the review screen shows the patient's name, email and
// submission date without fetching the file. That is still a read of health
// data, so it is authorised and audited on the same terms — recorded as
// 'metadata' so the trail distinguishes it from opening the file itself.
export async function readPrescriptionMetadataForSession(
  prescriptionId: string,
  session: Session | null
): Promise<PrescriptionMetadataResult> {
  const authorised = await authorise(prescriptionId, session)
  if (!authorised.ok) return authorised

  try {
    await logPrescriptionAccess({
      prescriptionId: authorised.prescription.id,
      accessorId: session!.customerId,
      accessorRole: session!.role,
      accessType: 'metadata',
    })
  } catch {
    return { ok: false, reason: 'audit_failed' }
  }

  return authorised
}
