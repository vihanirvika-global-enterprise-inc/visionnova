import { randomBytes } from 'crypto'
import { sql } from './db'
import { readKycDocument } from './kycStorage'
import { REVIEWER_ROLES } from './prescriptionAccess'
import type { OptometristPartner, KycStatus } from '@/types'

interface Session {
  customerId: string
  role: string
}

export type PartnerKycDenialReason = 'unauthenticated' | 'forbidden' | 'not_found' | 'unreadable'

interface CreateOptometristPartnerInput {
  customerId: string
  clinicName: string
  kycDocumentKey: string
}

export interface OptometristPartnerWithCustomer extends OptometristPartner {
  customerName: string
  customerEmail: string
}

function mapPartner(row: Record<string, unknown>): OptometristPartner {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    clinicName: row.clinic_name as string,
    kycStatus: row.kyc_status as KycStatus,
    kycDocumentKey: row.kyc_document_key as string,
    referralCode: row.referral_code as string,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

// Not cryptographically sensitive — a referral code is shared publicly by
// design — so a short random suffix is enough. The DB's UNIQUE constraint is
// the actual collision backstop; at partner-onboarding volume, retrying a
// rare collision isn't worth the complexity.
function generateReferralCode(): string {
  return `VN-${randomBytes(4).toString('hex').toUpperCase()}`
}

export async function createOptometristPartner(
  input: CreateOptometristPartnerInput
): Promise<OptometristPartner> {
  const referralCode = generateReferralCode()
  const rows = await sql`
    INSERT INTO optometrist_partners (customer_id, clinic_name, kyc_document_key, referral_code)
    VALUES (${input.customerId}, ${input.clinicName}, ${input.kycDocumentKey}, ${referralCode})
    RETURNING *
  `
  return mapPartner(rows[0])
}

export async function getPartnerByCustomerId(customerId: string): Promise<OptometristPartner | null> {
  const rows = await sql`SELECT * FROM optometrist_partners WHERE customer_id = ${customerId} LIMIT 1`
  return rows.length > 0 ? mapPartner(rows[0]) : null
}

export async function getPartnerById(id: string): Promise<OptometristPartner | null> {
  const rows = await sql`SELECT * FROM optometrist_partners WHERE id = ${id} LIMIT 1`
  return rows.length > 0 ? mapPartner(rows[0]) : null
}

export async function listPendingPartners(): Promise<OptometristPartnerWithCustomer[]> {
  const rows = await sql`
    SELECT p.*, c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email
    FROM optometrist_partners p
    JOIN customers c ON c.id = p.customer_id
    WHERE p.kyc_status = 'pending'
    ORDER BY p.created_at ASC
  `
  return rows.map((row) => ({
    ...mapPartner(row),
    customerName: row.customer_name as string,
    customerEmail: row.customer_email as string,
  }))
}

export async function updateKycStatus(id: string, status: KycStatus): Promise<OptometristPartner> {
  const rows = await sql`
    UPDATE optometrist_partners SET kyc_status = ${status}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return mapPartner(rows[0])
}

// Admin-only — not the "owner or reviewer" pattern readPrescriptionForSession
// uses, since a partner reviewing their own KYC submission isn't a
// requirement here. Reuses REVIEWER_ROLES (the same internal-staff roles
// trusted with prescription review) rather than a second, parallel list.
export async function readKycDocumentForSession(
  partnerId: string,
  session: Session | null
): Promise<
  | { ok: true; partner: OptometristPartner; file: Buffer }
  | { ok: false; reason: PartnerKycDenialReason }
> {
  if (!session) return { ok: false, reason: 'unauthenticated' }
  if (!REVIEWER_ROLES.includes(session.role)) return { ok: false, reason: 'forbidden' }

  const partner = await getPartnerById(partnerId)
  if (!partner) return { ok: false, reason: 'not_found' }

  try {
    const file = await readKycDocument(partner.kycDocumentKey)
    return { ok: true, partner, file }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}
