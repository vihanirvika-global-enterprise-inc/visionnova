import { sql } from './db'
import type { Prescription } from '@/types'

interface CreatePrescriptionInput {
  customerId: string
  fileUrl: string
}

function mapPrescription(row: Record<string, unknown>): Prescription {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    fileUrl: row.file_url as string,
    status: row.status as Prescription['status'],
    rightSphere: row.right_sphere as number | null,
    rightCylinder: row.right_cylinder as number | null,
    rightAxis: row.right_axis as number | null,
    rightAdd: row.right_add as number | null,
    leftSphere: row.left_sphere as number | null,
    leftCylinder: row.left_cylinder as number | null,
    leftAxis: row.left_axis as number | null,
    leftAdd: row.left_add as number | null,
    pupillaryDistance: row.pupillary_distance as number | null,
    expiresAt: row.expires_at as Date | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export async function createPrescription(input: CreatePrescriptionInput): Promise<Prescription> {
  const rows = await sql`
    INSERT INTO prescriptions (customer_id, file_url)
    VALUES (${input.customerId}, ${input.fileUrl})
    RETURNING *
  `
  return mapPrescription(rows[0])
}

export async function updatePrescriptionStatus(
  id: string,
  status: Prescription['status'],
): Promise<Prescription> {
  const rows = await sql`
    UPDATE prescriptions SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return mapPrescription(rows[0])
}

export async function getPrescriptionsByCustomer(customerId: string): Promise<Prescription[]> {
  const rows = await sql`
    SELECT * FROM prescriptions WHERE customer_id = ${customerId} ORDER BY created_at DESC
  `
  return rows.map(mapPrescription)
}
