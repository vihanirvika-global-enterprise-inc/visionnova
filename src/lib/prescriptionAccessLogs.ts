import { sql } from './db'

// Reviewed for EP-010 BUG-003 (Risk R-04/LEG-01 — Rx review audit trail):
// getAccessLogsByPrescription + getRecentAccessLogs (below) together are the
// "Audit-Log View" this ticket asks to confirm — per-prescription and
// cross-patient respectively, both backed by this table. No retention/purge
// job exists (rows are kept indefinitely); that's deliberate here, not an
// oversight — a fixed retention period trades off against LEG-01's need to
// retain evidence for product-liability defense and is a legal call, not an
// engineering one. See EP-010 report for the open question.
//
// 'file' is the scanned prescription itself; 'metadata' is the patient
// identity and submission detail shown on the review screen. Both are reads of
// health data; an auditor needs to tell them apart.
export type PrescriptionAccessType = 'file' | 'metadata'

export interface PrescriptionAccessLog {
  id: string
  prescriptionId: string
  accessorId: string
  // Joined from customers so a subject-access response names a person rather
  // than a UUID.
  accessorName: string
  accessorRole: string
  accessType: PrescriptionAccessType
  accessedAt: Date
}

interface LogPrescriptionAccessInput {
  prescriptionId: string
  accessorId: string
  accessorRole: string
  accessType: PrescriptionAccessType
}

function mapAccessLog(row: Record<string, unknown>): PrescriptionAccessLog {
  return {
    id: row.id as string,
    prescriptionId: row.prescription_id as string,
    accessorId: row.accessor_id as string,
    // The log outlives the account: a deleted staff record must not erase the
    // fact that someone read the file.
    accessorName: (row.accessor_name as string) ?? 'Unknown user',
    accessorRole: row.accessor_role as string,
    accessType: row.access_type as PrescriptionAccessType,
    accessedAt: row.accessed_at as Date,
  }
}

// Records a completed read. Call this only from readPrescriptionForSession —
// anything else reintroduces the per-call-site discipline this replaces.
export async function logPrescriptionAccess(
  input: LogPrescriptionAccessInput
): Promise<void> {
  await sql`
    INSERT INTO prescription_access_logs (prescription_id, accessor_id, accessor_role, access_type)
    VALUES (${input.prescriptionId}, ${input.accessorId}, ${input.accessorRole}, ${input.accessType})
  `
}

export async function getAccessLogsByPrescription(
  prescriptionId: string
): Promise<PrescriptionAccessLog[]> {
  // LEFT JOIN, not JOIN: the trail must survive the accessor's account being
  // removed, or deleting a user would silently drop evidence of their reads.
  const rows = await sql`
    SELECT l.*, c.first_name || ' ' || c.last_name AS accessor_name
    FROM prescription_access_logs l
    LEFT JOIN customers c ON c.id = l.accessor_id
    WHERE l.prescription_id = ${prescriptionId}
    ORDER BY l.accessed_at DESC
  `
  return rows.map(mapAccessLog)
}

export interface GlobalAccessLogEntry extends PrescriptionAccessLog {
  // Who the prescription belongs to — the per-prescription trail doesn't need
  // this (the page it's shown on already names the patient), but a console
  // spanning every prescription does.
  patientName: string
}

// ST-029 Compliance & Audit-Log console: every read across every
// prescription, not scoped to one record. Same fail-open-to-read-only shape
// as getAccessLogsByPrescription — this is a read of the audit trail itself,
// not of health data, so it isn't logged the way prescription reads are.
export async function getRecentAccessLogs(limit = 100): Promise<GlobalAccessLogEntry[]> {
  const rows = await sql`
    SELECT l.*, a.first_name || ' ' || a.last_name AS accessor_name,
      p.first_name || ' ' || p.last_name AS patient_name
    FROM prescription_access_logs l
    LEFT JOIN customers a ON a.id = l.accessor_id
    LEFT JOIN prescriptions r ON r.id = l.prescription_id
    LEFT JOIN customers p ON p.id = r.customer_id
    ORDER BY l.accessed_at DESC
    LIMIT ${limit}
  `
  return rows.map((row) => ({
    ...mapAccessLog(row),
    patientName: (row.patient_name as string) ?? 'Unknown patient',
  }))
}
