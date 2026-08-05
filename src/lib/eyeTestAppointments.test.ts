import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('generateAvailableSlots', () => {
  it('generates slots at the configured interval within the configured hours, for one day', async () => {
    const { generateAvailableSlots } = await import('./eyeTestAppointments')
    const from = new Date('2026-03-02T00:00:00') // a Monday, local time

    const slots = generateAvailableSlots([], {
      from, days: 1, startHour: 10, endHour: 12, intervalMinutes: 30,
    })

    expect(slots).toHaveLength(4) // 10:00, 10:30, 11:00, 11:30
    expect(slots[0].getHours()).toBe(10)
    expect(slots[0].getMinutes()).toBe(0)
    expect(slots[3].getHours()).toBe(11)
    expect(slots[3].getMinutes()).toBe(30)
  })

  it('excludes slots that are already booked', async () => {
    const { generateAvailableSlots } = await import('./eyeTestAppointments')
    const from = new Date('2026-03-02T00:00:00')
    const booked = new Date('2026-03-02T10:30:00')

    const slots = generateAvailableSlots([booked], {
      from, days: 1, startHour: 10, endHour: 11, intervalMinutes: 30,
    })

    expect(slots).toHaveLength(1)
    expect(slots[0].getMinutes()).toBe(0)
  })

  it('excludes slots that have already passed relative to "from"', async () => {
    const { generateAvailableSlots } = await import('./eyeTestAppointments')
    const from = new Date('2026-03-02T10:45:00')

    const slots = generateAvailableSlots([], {
      from, days: 1, startHour: 10, endHour: 12, intervalMinutes: 30,
    })

    // 10:00 and 10:30 are already past "from"; only 11:00 and 11:30 remain today
    expect(slots.every((slot) => slot.getTime() > from.getTime())).toBe(true)
    expect(slots).toHaveLength(2)
  })

  it('generates slots across multiple days', async () => {
    const { generateAvailableSlots } = await import('./eyeTestAppointments')
    const from = new Date('2026-03-02T00:00:00')

    const slots = generateAvailableSlots([], {
      from, days: 3, startHour: 10, endHour: 11, intervalMinutes: 30,
    })

    expect(slots).toHaveLength(6) // 2 slots/day x 3 days
    const uniqueDays = new Set(slots.map((s) => s.toDateString()))
    expect(uniqueDays.size).toBe(3)
  })
})

describe('getOptometrists', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns customers with the optometrist role', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{
      id: 'opt-1', email: 'opt@visionnova.com', password_hash: 'x',
      first_name: 'Ada', last_name: 'Lovelace', phone: null, role: 'optometrist',
      created_at: new Date(), updated_at: new Date(),
    }])

    const { getOptometrists } = await import('./eyeTestAppointments')
    const result = await getOptometrists()

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('optometrist')
  })

  // ST-022 (EP-007): a verified B2B2C partner clinic must be bookable too —
  // otherwise their queue could never have anything real in it. The query
  // itself enforces "verified only"; the mock here only proves the shape of
  // what's returned, not the WHERE clause (that's a real-DB concern, same as
  // every other flat query in this file).
  it('includes a verified partner_optometrist alongside internal optometrists', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([
      {
        id: 'opt-1', email: 'opt@visionnova.com', password_hash: 'x',
        first_name: 'Ada', last_name: 'Lovelace', phone: null, role: 'optometrist',
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: 'partner-cust-1', email: 'clinic@example.com', password_hash: 'x',
        first_name: 'Priya', last_name: 'Sharma', phone: null, role: 'partner_optometrist',
        created_at: new Date(), updated_at: new Date(),
      },
    ])

    const { getOptometrists } = await import('./eyeTestAppointments')
    const result = await getOptometrists()

    expect(result.map((o) => o.role)).toEqual(['optometrist', 'partner_optometrist'])
  })
})

describe('getBookedSlotTimes', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns the scheduled_at times for an optometrist within a range', async () => {
    const { sql } = await import('./db')
    const bookedAt = new Date('2026-03-02T10:00:00')
    mockSql(sql).mockResolvedValueOnce([{ scheduled_at: bookedAt }])

    const { getBookedSlotTimes } = await import('./eyeTestAppointments')
    const result = await getBookedSlotTimes('opt-1', new Date('2026-03-01'), new Date('2026-03-08'))

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toEqual([bookedAt])
  })
})

describe('createAppointment', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts a scheduled appointment', async () => {
    const { sql } = await import('./db')
    const scheduledAt = new Date('2026-03-02T10:00:00')
    mockSql(sql).mockResolvedValueOnce([{
      id: 'appt-1', customer_id: 'cust-1', optometrist_id: 'opt-1',
      scheduled_at: scheduledAt, status: 'scheduled', created_at: new Date(),
    }])

    const { createAppointment } = await import('./eyeTestAppointments')
    const appointment = await createAppointment('cust-1', 'opt-1', scheduledAt)

    expect(appointment.status).toBe('scheduled')
    expect(appointment.optometristId).toBe('opt-1')
  })

  // Backstop for the race a client-side "is this slot free" check can't
  // close on its own: two customers booking the same optometrist/time
  // concurrently can both pass a precheck before either insert commits.
  it('throws SlotAlreadyBookedError when the unique index rejects the insert', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockRejectedValueOnce({
      code: '23505',
      constraint_name: 'idx_eye_test_appointments_no_double_booking',
    })

    const { createAppointment, SlotAlreadyBookedError } = await import('./eyeTestAppointments')

    await expect(
      createAppointment('cust-1', 'opt-1', new Date('2026-03-02T10:00:00'))
    ).rejects.toBeInstanceOf(SlotAlreadyBookedError)
  })

  it('does not misclassify an unrelated database error as SlotAlreadyBookedError', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockRejectedValueOnce(new Error('connection lost'))

    const { createAppointment, SlotAlreadyBookedError } = await import('./eyeTestAppointments')

    await expect(
      createAppointment('cust-1', 'opt-1', new Date('2026-03-02T10:00:00'))
    ).rejects.not.toBeInstanceOf(SlotAlreadyBookedError)
  })
})

describe('getAppointmentById', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns the appointment by id', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{
      id: 'appt-1', customer_id: 'cust-1', optometrist_id: 'opt-1',
      scheduled_at: new Date(), status: 'scheduled', created_at: new Date(),
    }])

    const { getAppointmentById } = await import('./eyeTestAppointments')
    const result = await getAppointmentById('appt-1')

    expect(result?.id).toBe('appt-1')
  })

  it('returns null when no appointment matches', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getAppointmentById } = await import('./eyeTestAppointments')
    expect(await getAppointmentById('nonexistent')).toBeNull()
  })
})

describe('getAppointmentsByCustomer', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it("returns the customer's appointments", async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{
      id: 'appt-1', customer_id: 'cust-1', optometrist_id: 'opt-1',
      scheduled_at: new Date(), status: 'scheduled', created_at: new Date(),
    }])

    const { getAppointmentsByCustomer } = await import('./eyeTestAppointments')
    const result = await getAppointmentsByCustomer('cust-1')

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
  })
})

// ST-022 (C2. Optometrist Dashboard — "queue reflects real-time booking
// data"). The partner/optometrist-facing view of their own bookings, joined
// with the customer's name since the dashboard needs to show who's coming,
// not just an id.
describe('getAppointmentsByOptometrist', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it("returns the optometrist's upcoming appointments joined with customer name", async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{
      id: 'appt-1', customer_id: 'cust-1', optometrist_id: 'opt-1',
      scheduled_at: new Date('2026-03-02T10:00:00Z'), status: 'scheduled', created_at: new Date(),
      customer_name: 'Asha Rao',
    }])

    const { getAppointmentsByOptometrist } = await import('./eyeTestAppointments')
    const result = await getAppointmentsByOptometrist('opt-1')

    expect(sql).toHaveBeenCalledOnce()
    expect(result[0].customerName).toBe('Asha Rao')
    expect(result[0].optometristId).toBe('opt-1')
  })
})
