import { describe, it, expect } from 'vitest'
import { summariseAppointments, summariseCommissions } from './partnerSummaries'

const NOW = new Date('2026-08-08T12:00:00Z')
const at = (offsetHours: number) => new Date(NOW.getTime() + offsetHours * 3_600_000)

describe('summariseAppointments', () => {
  it('counts nothing for an empty queue', () => {
    expect(summariseAppointments([], NOW)).toEqual({ today: 0, upcoming: 0, completed: 0, cancelled: 0 })
  })

  it('counts a scheduled appointment later today as today', () => {
    const summary = summariseAppointments([{ scheduledAt: at(3), status: 'scheduled' }], NOW)

    expect(summary.today).toBe(1)
    expect(summary.upcoming).toBe(0)
  })

  it('counts a scheduled appointment tomorrow as upcoming, not today', () => {
    const summary = summariseAppointments([{ scheduledAt: at(24), status: 'scheduled' }], NOW)

    expect(summary.today).toBe(0)
    expect(summary.upcoming).toBe(1)
  })

  // Earlier today is still today: a clinician's day view should not empty out
  // as appointments pass.
  it('still counts an appointment earlier today', () => {
    expect(summariseAppointments([{ scheduledAt: at(-3), status: 'scheduled' }], NOW).today).toBe(1)
  })

  // A scheduled appointment on a past date is neither today nor upcoming —
  // counting it as upcoming would inflate the queue with visits that never
  // happened and were never closed off.
  it('counts neither today nor upcoming for a scheduled appointment in the past', () => {
    const summary = summariseAppointments([{ scheduledAt: at(-48), status: 'scheduled' }], NOW)

    expect(summary.today).toBe(0)
    expect(summary.upcoming).toBe(0)
  })

  it('counts completed and cancelled separately, whenever they were', () => {
    const summary = summariseAppointments(
      [
        { scheduledAt: at(1), status: 'completed' },
        { scheduledAt: at(-100), status: 'completed' },
        { scheduledAt: at(2), status: 'cancelled' },
      ],
      NOW
    )

    expect(summary).toMatchObject({ completed: 2, cancelled: 1, today: 0, upcoming: 0 })
  })

  it('does not count a cancelled appointment as part of today', () => {
    expect(summariseAppointments([{ scheduledAt: at(2), status: 'cancelled' }], NOW).today).toBe(0)
  })
})

describe('summariseCommissions', () => {
  it('reports zeroes for an empty ledger', () => {
    expect(summariseCommissions([])).toEqual({
      pendingCount: 0, reconciledCount: 0, knownTotal: 0, unpricedCount: 0,
    })
  })

  it('splits pending from reconciled', () => {
    const summary = summariseCommissions([
      { amount: 100, status: 'pending' },
      { amount: 250, status: 'reconciled' },
    ])

    expect(summary).toMatchObject({ pendingCount: 1, reconciledCount: 1 })
  })

  it('totals only the amounts that are actually recorded', () => {
    const summary = summariseCommissions([
      { amount: 100, status: 'pending' },
      { amount: 250, status: 'reconciled' },
    ])

    expect(summary.knownTotal).toBe(350)
  })

  // amount is nullable because no commission-rate rule exists yet. Treating a
  // null as zero would understate what is owed, and look authoritative doing it.
  it('counts an unpriced row rather than totalling it as zero', () => {
    const summary = summariseCommissions([
      { amount: null, status: 'pending' },
      { amount: 100, status: 'pending' },
    ])

    expect(summary.knownTotal).toBe(100)
    expect(summary.unpricedCount).toBe(1)
  })

  it('reports every row unpriced when none has an amount', () => {
    const summary = summariseCommissions([
      { amount: null, status: 'pending' },
      { amount: null, status: 'reconciled' },
    ])

    expect(summary).toMatchObject({ knownTotal: 0, unpricedCount: 2, pendingCount: 1, reconciledCount: 1 })
  })
})
