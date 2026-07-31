import { sql } from './db'

export interface PrescriptionAccessLog {
  id: string
  prescriptionId: string
  accessorId: string
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
  const rows = await sql`
    SELECT * FROM prescription_access_logs
    WHERE prescription_id = ${prescriptionId}
    ORDER BY accessed_at DESC
  `
  return rows.map(mapAccessLog)
}
