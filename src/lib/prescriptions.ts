import { sql } from './db'
import type { Prescription, PrescriptionReviewLog, PrescriptionWithCustomer, RejectionReason, ReviewStatus } from '@/types'
import { getCustomerById } from './customers'
import { sendPrescriptionStatusEmail } from './email'
import { sendEmailBestEffort } from './bestEffortEmail'

interface CreatePrescriptionInput {
  customerId: string
  // null for a digitally-authored prescription (ST-023) — there is no
  // uploaded document.
  fileUrl: string | null
  consentGivenAt: Date
  // Defaults to the DB's own 'pending' default (customer upload, awaiting
  // review) when omitted. The Digital Rx Writing Tool passes 'approved'
  // explicitly — the optometrist wrote it themselves, no separate review
  // queue applies.
  status?: Prescription['status']
  rightSphere?: number | null
  rightCylinder?: number | null
  rightAxis?: number | null
  rightAdd?: number | null
  leftSphere?: number | null
  leftCylinder?: number | null
  leftAxis?: number | null
  leftAdd?: number | null
  pupillaryDistance?: number | null
}

// NUMERIC columns come back from the Postgres driver as strings (precision
// preservation), unlike INTEGER — this was previously unnoticed because
// nothing ever wrote real values through this path; ST-023 is the first
// caller that does.
function numericOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  return parseFloat(value as string)
}

function mapPrescription(row: Record<string, unknown>): Prescription {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    fileUrl: row.file_url as string | null,
    status: row.status as Prescription['status'],
    consentGivenAt: (row.consent_given_at as Date) ?? null,
    rightSphere: numericOrNull(row.right_sphere),
    rightCylinder: numericOrNull(row.right_cylinder),
    rightAxis: row.right_axis as number | null,
    rightAdd: numericOrNull(row.right_add),
    leftSphere: numericOrNull(row.left_sphere),
    leftCylinder: numericOrNull(row.left_cylinder),
    leftAxis: row.left_axis as number | null,
    leftAdd: numericOrNull(row.left_add),
    pupillaryDistance: numericOrNull(row.pupillary_distance),
    expiresAt: row.expires_at as Date | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

export async function createPrescription(input: CreatePrescriptionInput): Promise<Prescription> {
  const rows = await sql`
    INSERT INTO prescriptions (
      customer_id, file_url, consent_given_at, status,
      right_sphere, right_cylinder, right_axis, right_add,
      left_sphere, left_cylinder, left_axis, left_add,
      pupillary_distance
    )
    VALUES (
      ${input.customerId}, ${input.fileUrl}, ${input.consentGivenAt},
      ${input.status ?? 'pending'},
      ${input.rightSphere ?? null}, ${input.rightCylinder ?? null},
      ${input.rightAxis ?? null}, ${input.rightAdd ?? null},
      ${input.leftSphere ?? null}, ${input.leftCylinder ?? null},
      ${input.leftAxis ?? null}, ${input.leftAdd ?? null},
      ${input.pupillaryDistance ?? null}
    )
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
            // EP-010 BUG-004 / FTC Eyeglass Rule: the patient must
            // automatically receive a copy of the prescription on approval.
            // hasFile tells the template to point at the account page
            // instead; clinicalValues carries the actual prescription when
            // there is no file to point at (a digitally-authored Rx).
            hasFile: Boolean(prescription.fileUrl),
            clinicalValues: {
              rightSphere: prescription.rightSphere,
              rightCylinder: prescription.rightCylinder,
              rightAxis: prescription.rightAxis,
              rightAdd: prescription.rightAdd,
              leftSphere: prescription.leftSphere,
              leftCylinder: prescription.leftCylinder,
              leftAxis: prescription.leftAxis,
              leftAdd: prescription.leftAdd,
              pupillaryDistance: prescription.pupillaryDistance,
            },
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

// Reviewed for EP-010 BUG-003: this is the review-decision half of the Rx
// audit trail (who approved/rejected, why, and when) — the read-access half
// lives in prescriptionAccessLogs.ts. Together they satisfy the ticket's
// "confirm Audit-Log View" requirement.
export async function logPrescriptionReviewAction(input: LogPrescriptionReviewInput): Promise<void> {
  await sql`
    INSERT INTO prescription_review_logs (prescription_id, reviewer_id, action, rejection_reason, note)
    VALUES (${input.prescriptionId}, ${input.reviewerId}, ${input.action}, ${input.rejectionReason ?? null}, ${input.note ?? null})
  `
}
