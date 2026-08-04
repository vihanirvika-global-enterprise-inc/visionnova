import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import {
  getOptometrists,
  getBookedSlotTimes,
  generateAvailableSlots,
} from '@/lib/eyeTestAppointments'
import { bookAppointmentAction } from './actions'

export const metadata: Metadata = {
  title: 'Book an Eye Test',
  description: 'Book a teleoptometry eye test with a licensed optometrist.',
}

interface EyeTestPageProps {
  searchParams: { optometrist?: string; error?: string }
}

function formatSlotLabel(slot: Date): string {
  return slot.toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit',
  })
}

// ST-008 (A8. Teleoptometry / Eye-Test — "no double-booking across
// optometrists"). Scheduling only: this books a slot with an optometrist.
// The eye test itself (video call) has no implementation here — no calling
// infrastructure exists in this stack, and that remains a deliberate,
// separate scope decision (see CLAUDE.md).
export default async function EyeTestPage({ searchParams }: EyeTestPageProps) {
  const session = getSession()
  if (!session) {
    redirect('/login')
  }

  const optometrists = await getOptometrists()
  const selectedId = searchParams.optometrist
  const selectedOptometrist = optometrists.find((o) => o.id === selectedId)

  let slots: Date[] = []
  if (selectedOptometrist) {
    const from = new Date()
    const to = new Date(from)
    to.setDate(to.getDate() + 7)
    const bookedTimes = await getBookedSlotTimes(selectedOptometrist.id, from, to)
    slots = generateAvailableSlots(bookedTimes, { from })
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-dark">Book an Eye Test</h1>
        <p className="mt-2 text-muted">
          Schedule a teleoptometry appointment with a licensed optometrist.
        </p>
      </div>

      {searchParams.error && (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {searchParams.error}
        </p>
      )}

      {optometrists.length === 0 ? (
        <p className="text-muted">No optometrists are available for booking right now.</p>
      ) : !selectedOptometrist ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-dark">Choose an optometrist</p>
          {optometrists.map((optometrist) => (
            <a
              key={optometrist.id}
              href={`/eye-test?optometrist=${optometrist.id}`}
              className="card flex items-center justify-between p-4 hover:bg-surface"
            >
              <span className="font-medium text-dark">
                Dr. {optometrist.firstName} {optometrist.lastName}
              </span>
              <span className="text-sm text-primary">Select →</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-dark">
              Dr. {selectedOptometrist.firstName} {selectedOptometrist.lastName}
            </p>
            <a href="/eye-test" className="text-sm text-primary hover:text-teal">
              Change optometrist
            </a>
          </div>

          {slots.length === 0 ? (
            <p className="text-muted">No available slots in the next 7 days.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slots.map((slot) => (
                <form key={slot.toISOString()} action={bookAppointmentAction}>
                  <input type="hidden" name="optometristId" value={selectedOptometrist.id} />
                  <input type="hidden" name="scheduledAt" value={slot.toISOString()} />
                  <button type="submit" className="btn-secondary w-full text-sm">
                    {formatSlotLabel(slot)}
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
