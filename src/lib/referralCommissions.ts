import { sql } from './db'
import type { ReferralCommission } from '@/types'

// ST-024 (C4. Referral & Commission Tracker) — ledger shell only. There is
// deliberately no createReferralCommission / attribution function here: what
// counts as a referral and how commission is calculated are real business
// decisions this codebase has no rule for yet (see implementation report).
// This table and this read function exist so the screen is genuinely wired
// to real data — currently always empty — rather than to a mock.
function mapCommission(row: Record<string, unknown>): ReferralCommission {
  return {
    id: row.id as string,
    partnerId: row.partner_id as string,
    orderId: row.order_id as string,
    amount: row.amount === null ? null : parseFloat(row.amount as string),
    status: row.status as ReferralCommission['status'],
    createdAt: row.created_at as Date,
  }
}

export async function getCommissionLedger(partnerId: string): Promise<ReferralCommission[]> {
  const rows = await sql`
    SELECT * FROM referral_commissions WHERE partner_id = ${partnerId} ORDER BY created_at DESC
  `
  return rows.map(mapCommission)
}
