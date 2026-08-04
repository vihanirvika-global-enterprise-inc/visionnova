import { sql } from './db'
import type { Customer, CustomerRole, EyeTestAppointment } from '@/types'

export class SlotAlreadyBookedError extends Error {
  constructor() {
    super('This slot was just booked by someone else')
    this.name = 'SlotAlreadyBookedError'
  }
}

// Same shape as isEmailUniqueViolation in src/lib/auth.ts — the constraint
// name is what distinguishes "this specific race" from any other unique
// violation.
function isSlotUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505' &&
    'constraint_name' in error &&
    (error as { constraint_name: unknown }).constraint_name ===
      'idx_eye_test_appointments_no_double_booking'
  )
}

export interface SlotGenerationOptions {
  from?: Date
  days?: number
  startHour?: number
  endHour?: number
  intervalMinutes?: number
}

// Pure and DB-independent on purpose: no optometrist-availability table
// exists yet (no admin UI to manage one), so slots are fixed working hours
// generated on the fly. bookedTimes/`from` are the only inputs that make
// this vary per call.
export function generateAvailableSlots(
  bookedTimes: Date[],
  options: SlotGenerationOptions = {}
): Date[] {
  const {
    from = new Date(),
    days = 7,
    startHour = 10,
    endHour = 17,
    intervalMinutes = 30,
  } = options

  const bookedTimestamps = new Set(bookedTimes.map((t) => t.getTime()))
  const slots: Date[] = []

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const day = new Date(from)
    day.setDate(day.getDate() + dayOffset)

    for (let minutes = startHour * 60; minutes < endHour * 60; minutes += intervalMinutes) {
      const slot = new Date(day)
      slot.setHours(0, minutes, 0, 0)

      if (slot.getTime() <= from.getTime()) continue
      if (bookedTimestamps.has(slot.getTime())) continue

      slots.push(slot)
    }
  }

  return slots
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    phone: row.phone as string | null,
    role: (row.role as CustomerRole) ?? 'customer',
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  }
}

// ST-022 (EP-007): a verified B2B2C partner clinic is bookable exactly like
// an internal optometrist — an unverified one is not, so this stays a real
// gate rather than exposing every partner signup immediately.
export async function getOptometrists(): Promise<Customer[]> {
  const rows = await sql`
    SELECT c.* FROM customers c
    LEFT JOIN optometrist_partners p ON p.customer_id = c.id
    WHERE c.role = 'optometrist'
       OR (c.role = 'partner_optometrist' AND p.kyc_status = 'verified')
    ORDER BY c.first_name ASC
  `
  return rows.map(mapCustomer)
}

export async function getBookedSlotTimes(
  optometristId: string,
  from: Date,
  to: Date
): Promise<Date[]> {
  const rows = await sql`
    SELECT scheduled_at FROM eye_test_appointments
    WHERE optometrist_id = ${optometristId}
      AND status != 'cancelled'
      AND scheduled_at >= ${from}
      AND scheduled_at < ${to}
  `
  return rows.map((row) => row.scheduled_at as Date)
}

function mapAppointment(row: Record<string, unknown>): EyeTestAppointment {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    optometristId: row.optometrist_id as string,
    scheduledAt: row.scheduled_at as Date,
    status: row.status as EyeTestAppointment['status'],
    createdAt: row.created_at as Date,
  }
}

export async function getAppointmentById(id: string): Promise<EyeTestAppointment | null> {
  const rows = await sql`SELECT * FROM eye_test_appointments WHERE id = ${id} LIMIT 1`
  return rows.length > 0 ? mapAppointment(rows[0]) : null
}

export async function createAppointment(
  customerId: string,
  optometristId: string,
  scheduledAt: Date
): Promise<EyeTestAppointment> {
  try {
    const rows = await sql`
      INSERT INTO eye_test_appointments (customer_id, optometrist_id, scheduled_at)
      VALUES (${customerId}, ${optometristId}, ${scheduledAt})
      RETURNING *
    `
    return mapAppointment(rows[0])
  } catch (error) {
    if (isSlotUniqueViolation(error)) {
      throw new SlotAlreadyBookedError()
    }
    throw error
  }
}

export async function getAppointmentsByCustomer(customerId: string): Promise<EyeTestAppointment[]> {
  const rows = await sql`
    SELECT * FROM eye_test_appointments
    WHERE customer_id = ${customerId}
    ORDER BY scheduled_at ASC
  `
  return rows.map(mapAppointment)
}

export interface EyeTestAppointmentWithCustomer extends EyeTestAppointment {
  customerName: string
}

// ST-022: the optometrist/partner-facing queue — always a live query against
// eye_test_appointments, never a cached or client-polled copy, so "real-time"
// is structural rather than something to keep in sync.
export async function getAppointmentsByOptometrist(
  optometristId: string
): Promise<EyeTestAppointmentWithCustomer[]> {
  const rows = await sql`
    SELECT a.*, c.first_name || ' ' || c.last_name AS customer_name
    FROM eye_test_appointments a
    JOIN customers c ON c.id = a.customer_id
    WHERE a.optometrist_id = ${optometristId}
    ORDER BY a.scheduled_at ASC
  `
  return rows.map((row) => ({
    ...mapAppointment(row),
    customerName: row.customer_name as string,
  }))
}
