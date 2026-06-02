import { sql } from './db'
import type { OptometristReview, ReviewStatus } from '@/types'

interface CreateOptometristReviewInput {
  prescriptionId: string
  reviewerName: string
  status: ReviewStatus
  notes?: string
}

function mapReview(row: Record<string, unknown>): OptometristReview {
  return {
    id: row.id as string,
    prescriptionId: row.prescription_id as string,
    reviewerName: row.reviewer_name as string,
    status: row.status as ReviewStatus,
    notes: row.notes as string | null,
    reviewedAt: row.reviewed_at as Date,
    createdAt: row.created_at as Date,
  }
}

export async function createOptometristReview(
  input: CreateOptometristReviewInput,
): Promise<OptometristReview> {
  const rows = await sql`
    INSERT INTO optometrist_reviews (prescription_id, reviewer_name, status, notes)
    VALUES (${input.prescriptionId}, ${input.reviewerName}, ${input.status}, ${input.notes ?? null})
    RETURNING *
  `
  return mapReview(rows[0])
}
