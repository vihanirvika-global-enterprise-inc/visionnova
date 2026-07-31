import { sql } from './db'

export interface PrescriptionAccessLog {
  id: string
  prescriptionId: string
  accessorId: string
  // Joined from customers so a subject-access response names a person rather
  // than a UUID.
  accessorName: string
  accessorRole: string
  accessedAt: Date
}

interface LogPrescriptionAccessInput {
  prescriptionId: string
  accessorId: string
  accessorRole: string
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
    accessedAt: row.accessed_at as Date,
  }
}

// Records a completed read. Call this only from readPrescriptionForSession —
// anything else reintroduces the per-call-site discipline this replaces.
export async function logPrescriptionAccess(
  input: LogPrescriptionAccessInput
): Promise<void> {
  await sql`
    INSERT INTO prescription_access_logs (prescription_id, accessor_id, accessor_role)
    VALUES (${input.prescriptionId}, ${input.accessorId}, ${input.accessorRole})
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
