import { sql } from './db'
import type { Prescription, PrescriptionReviewLog, PrescriptionWithCustomer, RejectionReason, ReviewStatus } from '@/types'
import { getCustomerById } from './customers'
import { sendPrescriptionStatusEmail } from './email'
import { sendEmailBestEffort } from './bestEffortEmail'

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
  const prescription = mapPrescription(rows[0])

  if (status === 'approved' || status === 'rejected') {
    const customer = await getCustomerById(prescription.customerId)
    if (customer) {
      // The decision is already committed. Letting a mail failure propagate
      // aborts the caller mid-flow — in the review action that skips
      // logPrescriptionReviewAction, leaving an approved prescription with no
      // record of who approved it.
      await sendEmailBestEffort(
        () =>
          sendPrescriptionStatusEmail({
            to: customer.email,
            firstName: customer.firstName,
            status,
          }),
        { prescriptionId: prescription.id }
      )
    }
  }

  return prescription
}

export async function getPrescriptionById(id: string): Promise<PrescriptionWithCustomer | null> {
  const rows = await sql`
    SELECT p.*, c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email
    FROM prescriptions p
    JOIN customers c ON c.id = p.customer_id
    WHERE p.id = ${id}
  `
  if (rows.length === 0) return null
  return {
    ...mapPrescription(rows[0]),
    customerName: rows[0].customer_name as string,
    customerEmail: rows[0].customer_email as string,
  }
}

export async function getReviewLogsByPrescription(prescriptionId: string): Promise<PrescriptionReviewLog[]> {
  const rows = await sql`
    SELECT l.*, c.first_name || ' ' || c.last_name AS reviewer_name
    FROM prescription_review_logs l
    JOIN customers c ON c.id = l.reviewer_id
    WHERE l.prescription_id = ${prescriptionId}
    ORDER BY l.created_at DESC
  `
  return rows.map((row) => ({
    id: row.id as string,
    prescriptionId: row.prescription_id as string,
    reviewerId: row.reviewer_id as string,
    reviewerName: row.reviewer_name as string,
    action: row.action as ReviewStatus,
    rejectionReason: row.rejection_reason as RejectionReason | null,
    note: row.note as string | null,
    createdAt: row.created_at as Date,
  }))
}

export async function getPrescriptionsByCustomer(customerId: string): Promise<Prescription[]> {
  const rows = await sql`
    SELECT * FROM prescriptions WHERE customer_id = ${customerId} ORDER BY created_at DESC
  `
  return rows.map(mapPrescription)
}

export async function getPendingPrescriptions(): Promise<PrescriptionWithCustomer[]> {
  const rows = await sql`
    SELECT p.*, c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email
    FROM prescriptions p
    JOIN customers c ON c.id = p.customer_id
    WHERE p.status = 'pending'
    ORDER BY p.created_at ASC
  `
  return rows.map((row) => ({
    ...mapPrescription(row),
    customerName: row.customer_name as string,
    customerEmail: row.customer_email as string,
  }))
}

interface LogPrescriptionReviewInput {
  prescriptionId: string
  reviewerId: string
  action: ReviewStatus
  note?: string
  rejectionReason?: RejectionReason
}

export async function logPrescriptionReviewAction(input: LogPrescriptionReviewInput): Promise<void> {
  await sql`
    INSERT INTO prescription_review_logs (prescription_id, reviewer_id, action, rejection_reason, note)
    VALUES (${input.prescriptionId}, ${input.reviewerId}, ${input.action}, ${input.rejectionReason ?? null}, ${input.note ?? null})
  `
}
