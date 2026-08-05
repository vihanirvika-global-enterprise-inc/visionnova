import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getPartnerByCustomerId } from '@/lib/optometristPartners'
import { getCommissionLedger } from '@/lib/referralCommissions'
import { formatPrice } from '@/lib/formatters'

export const metadata: Metadata = {
  title: 'Referral & Commissions',
}

// ST-024 (C4. Referral & Commission Tracker) — ledger shell only, per
// explicit scoping decision. This is real, working UI over real (currently
// always-empty) data — not a mock — but there is no attribution mechanism
// (what makes an order "referred" by this partner) or commission-rate rule
// anywhere in this codebase, so the ledger has nothing to show yet. See the
// implementation report for what a real version needs.
export default async function CommissionsPage() {
  const session = getSession()
  if (!session) {
    redirect('/login')
  }

  const partner = await getPartnerByCustomerId(session.customerId)
  if (!partner) {
    redirect('/partner-portal/register')
  }

  const ledger = await getCommissionLedger(partner.id)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-dark">Referral &amp; Commissions</h1>
        <p className="mt-2 text-muted">{partner.clinicName}</p>
      </div>

      <div className="mb-6 card p-4 text-sm">
        <span className="text-muted">Share your referral code: </span>
        <span className="font-semibold text-dark">{partner.referralCode}</span>
      </div>

      <div className="card p-6">
        <p className="mb-4 text-lg font-semibold text-dark">Ledger</p>

        {ledger.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted">No referral activity recorded yet.</p>
            <p className="mt-2 text-xs text-muted">
              Referral attribution and commission calculation are not yet available —
              contact support@visionnova.com if you have questions about the partner program.
            </p>
          </div>
        ) : (
          <div>
            {ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0"
              >
                <div>
                  <p className="font-medium text-dark">Order #{entry.orderId}</p>
                  <span className="mt-0.5 block text-xs text-muted">
                    {entry.createdAt.toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">
                    {entry.amount === null ? (
                      <span className="text-sm font-normal text-muted">Not yet calculated</span>
                    ) : (
                      formatPrice(entry.amount)
                    )}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {entry.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link href="/partner-portal" className="text-sm font-medium text-primary hover:text-teal">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  )
}
