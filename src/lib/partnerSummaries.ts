import type { EyeTestAppointment, ReferralCommission } from '@/types'

// Everything here is counted from rows that exist. The mockup's dashboard tiles
// — "Referred customers 148", "Rx written 96", "Conversion 64%" — have no
// source: nothing attributes a customer to a partner, nothing counts
// prescriptions per optometrist, and a conversion rate needs both. Inventing
// them would put fabricated performance figures in front of someone whose pay
// depends on them.

export interface AppointmentSummary {
  today: number
  upcoming: number
  completed: number
  cancelled: number
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function summariseAppointments(
  appointments: Pick<EyeTestAppointment, 'scheduledAt' | 'status'>[],
  now: Date = new Date()
): AppointmentSummary {
  const summary: AppointmentSummary = { today: 0, upcoming: 0, completed: 0, cancelled: 0 }

  for (const appointment of appointments) {
    if (appointment.status === 'completed') summary.completed += 1
    else if (appointment.status === 'cancelled') summary.cancelled += 1
    else {
      // Scheduled splits by when, not by another status: "today" is the number
      // a clinician actually plans their day around.
      if (isSameDay(appointment.scheduledAt, now)) summary.today += 1
      else if (appointment.scheduledAt.getTime() > now.getTime()) summary.upcoming += 1
    }
  }

  return summary
}

export interface CommissionSummary {
  pendingCount: number
  reconciledCount: number
  // Only rows whose amount is actually recorded. referral_commissions.amount is
  // nullable because no commission-rate rule exists yet, so a row can be logged
  // before anyone can say what it is worth.
  knownTotal: number
  // Rows with no amount yet. Surfaced rather than folded into the total as
  // zero, which would understate what is owed and look authoritative doing it.
  unpricedCount: number
}

export function summariseCommissions(
  entries: Pick<ReferralCommission, 'amount' | 'status'>[]
): CommissionSummary {
  const summary: CommissionSummary = {
    pendingCount: 0,
    reconciledCount: 0,
    knownTotal: 0,
    unpricedCount: 0,
  }

  for (const entry of entries) {
    if (entry.status === 'reconciled') summary.reconciledCount += 1
    else summary.pendingCount += 1

    if (entry.amount === null) summary.unpricedCount += 1
    else summary.knownTotal += entry.amount
  }

  return summary
}
