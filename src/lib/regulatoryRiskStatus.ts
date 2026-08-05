// EP-010 BUG-001 / BUG-005 / BUG-012 (Risk Register R-01/REG-01, TECH-01/
// FIN-04, OPS-04/PEO-02). None of these three items can be closed by code —
// they're a regulatory filing, a payment-vendor contract, and a hiring
// decision. This module exists only to make it impossible to miss that
// they're still outstanding, the same principle already applied to the
// Grievance Officer contact (see Footer.tsx / envExample.test.ts): a real
// business/legal action still has to happen, and the deploy environment has
// to say so rather than silently rendering as if it happened.
export interface RegulatoryRiskItem {
  id: string
  riskRef: string
  label: string
  configured: boolean
  detail: string
}

export function getRegulatoryRiskStatus(): RegulatoryRiskItem[] {
  const registrationConfirmedAt = process.env.REGULATORY_ESTABLISHMENT_REGISTRATION_CONFIRMED_AT
  const backupProcessor = process.env.BACKUP_PAYMENT_PROCESSOR_NAME
  const optometristCount = parseInt(process.env.LICENSED_OPTOMETRIST_COUNT ?? '', 10) || 0

  return [
    {
      id: 'regulatory-establishment-registration',
      riskRef: 'R-01 / REG-01',
      label: 'Regulatory establishment registration for selling prescription eyewear',
      configured: Boolean(registrationConfirmedAt),
      detail: registrationConfirmedAt
        ? `Confirmed ${registrationConfirmedAt}`
        : 'Not confirmed — set REGULATORY_ESTABLISHMENT_REGISTRATION_CONFIRMED_AT once legal/compliance has written confirmation from the regulator.',
    },
    {
      id: 'backup-payment-processor',
      riskRef: 'TECH-01 / FIN-04',
      label: 'Backup payment processor configured',
      configured: Boolean(backupProcessor),
      detail: backupProcessor
        ? `Configured: ${backupProcessor}`
        : 'Not configured — checkout has a single point of failure per region (Razorpay for IN, Stripe elsewhere). Set BACKUP_PAYMENT_PROCESSOR_NAME once a second vendor is contracted and its provider adapter is implemented.',
    },
    {
      id: 'optometrist-staffing-redundancy',
      riskRef: 'OPS-04 / PEO-02',
      label: 'Minimum two licensed optometrists on staff',
      configured: optometristCount >= 2,
      detail: optometristCount >= 2
        ? `${optometristCount} on record`
        : `${optometristCount} on record — set LICENSED_OPTOMETRIST_COUNT once a second licensed optometrist joins.`,
    },
  ]
}
