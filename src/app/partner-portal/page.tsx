import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getPartnerByCustomerId } from '@/lib/optometristPartners'
import { getAppointmentsByOptometrist } from '@/lib/eyeTestAppointments'
import { summariseAppointments } from '@/lib/partnerSummaries'

export const metadata: Metadata = {
  title: 'Partner Dashboard',
}

function formatAppointmentTime(scheduledAt: Date): string {
  return scheduledAt.toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit',
  })
}

// ST-022 (C2. Optometrist Dashboard — "queue reflects real-time booking
// data"). The queue is a direct query (getAppointmentsByOptometrist), not a
// cached or polled copy, so it's real-time by construction.
export default async function PartnerDashboardPage() {
  const session = getSession()
  if (!session) {
    redirect('/login')
  }

  const partner = await getPartnerByCustomerId(session.customerId)
  if (!partner) {
    // Middleware already confirmed the session's role is partner_optometrist
    // (or admin) to reach this page — a missing partner row means onboarding
    // never completed, not an authorisation failure.
    redirect('/partner-portal/register')
  }

  const queue = await getAppointmentsByOptometrist(session.customerId)
  const upcoming = queue.filter((appointment) => appointment.status === 'scheduled')

  // Counted from the queue already loaded — no extra query, and no figure
  // that is not a count of rows sitting in front of us.
  const summary = summariseAppointments(queue)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-dark">{partner.clinicName}</h1>
        <p className="mt-2 text-muted">Partner Dashboard</p>
      </div>

      {partner.kycStatus === 'pending' && (
        <div role="status" className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your KYC documents are pending review. You can view your booking queue, but writing
          prescriptions is enabled once verification is complete.
        </div>
      )}
      {partner.kycStatus === 'rejected' && (
        <div role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          Your KYC verification was rejected. Contact support@visionnova.com to resubmit.
        </div>
      )}

      <div className="mb-6 card p-4 text-sm">
        <span className="text-muted">Your referral code: </span>
        <span className="font-semibold text-dark">{partner.referralCode}</span>
      </div>

      {/* TODO (C2): the mockup's dashboard tiles were "Referred customers
          148", "Rx written 96", "Commission (mo.) ₹18,450" and "Conversion
          64%". None ships. Nothing attributes a customer to a partner, nothing
          counts prescriptions per optometrist, and a conversion rate needs
          both — so all four would be invented performance figures shown to
          someone whose pay depends on them. The commission ledger on
          /partner-portal/commissions is the honest version, and says plainly
          that attribution does not exist yet. Build these when referral
          attribution does. */}
      <section aria-labelledby="glance-heading" className="mb-6 card p-6">
        <h2 id="glance-heading" className="mb-4 text-lg font-semibold text-dark">
          At a glance
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { key: 'today', label: 'Today', value: summary.today },
            { key: 'upcoming', label: 'Upcoming', value: summary.upcoming },
            { key: 'completed', label: 'Completed', value: summary.completed },
            { key: 'cancelled', label: 'Cancelled', value: summary.cancelled },
          ].map((tile) => (
            <div key={tile.key}>
              <dt className="text-xs text-muted">{tile.label}</dt>
              <dd
                data-testid={`summary-${tile.key}`}
                className="text-2xl font-semibold text-dark"
              >
                {tile.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="card p-6">
        <div className="mb-4 flex items-center">
          <p className="text-lg font-semibold text-dark">Booking Queue</p>
          <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
            {upcoming.length}
          </span>
        </div>

        {upcoming.length === 0 ? (
          <p className="py-8 text-center text-muted">No upcoming appointments</p>
        ) : (
          <div>
            {upcoming.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0"
              >
                <div>
                  <p className="font-medium text-dark">{appointment.customerName}</p>
                  <span className="mt-0.5 block text-xs text-muted">
                    {formatAppointmentTime(appointment.scheduledAt)}
                  </span>
                </div>
                {partner.kycStatus === 'verified' && (
                  <Link
                    href={`/partner-portal/appointments/${appointment.id}/write-rx`}
                    className="btn-secondary text-sm"
                  >
                    Write Prescription
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link href="/partner-portal/commissions" className="text-sm font-medium text-primary hover:text-teal">
          Referral &amp; Commissions →
        </Link>
      </div>
    </main>
  )
}
