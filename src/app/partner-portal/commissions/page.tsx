import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getPartnerByCustomerId } from '@/lib/optometristPartners'
import { getCommissionLedger } from '@/lib/referralCommissions'
import { formatPrice } from '@/lib/formatters'
import { summariseCommissions } from '@/lib/partnerSummaries'

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
  const summary = summariseCommissions(ledger)

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

      {/* Only rendered when there is something to summarise. On an empty
          ledger the honest empty state below says attribution does not exist
          yet — a row of ₹0 tiles above it would imply the system is working
          and this partner has simply earned nothing. */}
      {ledger.length > 0 && (
        <section aria-labelledby="summary-heading" className="mb-6 card p-6">
          <h2 id="summary-heading" className="mb-4 text-lg font-semibold text-dark">
            Summary
          </h2>
          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-xs text-muted">Pending</dt>
              <dd data-testid="summary-pending" className="text-2xl font-semibold text-dark">
                {summary.pendingCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Reconciled</dt>
              <dd data-testid="summary-reconciled" className="text-2xl font-semibold text-dark">
                {summary.reconciledCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Recorded total</dt>
              <dd data-testid="summary-total" className="text-2xl font-semibold text-dark">
                {formatPrice(summary.knownTotal)}
              </dd>
            </div>
          </dl>

          {/* amount is nullable: a referral can be logged before anyone can
              say what it is worth. Counting those as zero would understate
              what is owed, and the total would look authoritative doing it. */}
          {summary.unpricedCount > 0 && (
            <p className="mt-4 text-xs text-muted">
              {summary.unpricedCount} {summary.unpricedCount === 1 ? 'entry has' : 'entries have'}{' '}
              no amount recorded yet, so {summary.unpricedCount === 1 ? 'it is' : 'they are'} not
              included in the total.
            </p>
          )}
        </section>
      )}

      {/* TODO (C4): the mockup offered "Download statement" and a referral URL
          (visionnova.in/r/DRMEERA) with a copy button. Neither ships. There is
          no statement generator anywhere in this repo, and no /r/[code] route
          — the referral code below is real, but a link built from it would
          404. It also promised monthly payouts; no payout schedule exists to
          promise. Build each when the thing behind it does. */}

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
