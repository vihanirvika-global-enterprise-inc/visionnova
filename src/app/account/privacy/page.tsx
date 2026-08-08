import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AnalyticsConsentControl } from '@/components/consent/AnalyticsConsentControl'
import { getSession } from '@/lib/session'
import { getCustomerById } from '@/lib/customers'
import { getPrescriptionsByCustomer } from '@/lib/prescriptions'
import { getOrdersByCustomer } from '@/lib/orders'
import { getAccessLogsByCustomer } from '@/lib/prescriptionAccessLogs'
import { isUuid } from '@/lib/uuid'

export const metadata: Metadata = {
  title: 'My Privacy',
  description: "Your rights under India's Digital Personal Data Protection Act, 2023.",
}

function consentStatusLabel(consentGivenAt: Date | null): string {
  if (!consentGivenAt) return 'Predates consent capture — not recorded'
  return `Consent given ${consentGivenAt.toLocaleDateString('en-IN')}`
}

function mailto(subject: string, body: string): string {
  return `mailto:support@visionnova.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ST-019 (B4. My Privacy — DPDP Rights, "India-first DPDP Act 2023
// differentiator"). Access/correction/erasure/consent-withdrawal requests
// route through email, matching the same honest pattern as returns and
// password recovery elsewhere in this app — no automated self-service
// pipeline exists for any of these, and pretending otherwise would be worse
// than the plain mailto. The Grievance Officer section duplicates Footer's
// env-var read rather than sharing it — a small, deliberate duplication
// over extracting a one-call-site helper.
export default async function PrivacyPage() {
  const session = getSession()
  if (!session) {
    redirect('/login')
  }

  // getSession already rejects a malformed id, so this is defence in depth
  // rather than the primary guard — but every id below reaches a uuid column,
  // and this page must not depend on another module's validation to avoid a
  // 500 while someone is exercising a statutory right.
  if (!isUuid(session.customerId)) {
    redirect('/login')
  }

  const [customer, prescriptions, orders, accessLogs] = await Promise.all([
    getCustomerById(session.customerId),
    getPrescriptionsByCustomer(session.customerId),
    getOrdersByCustomer(session.customerId),
    getAccessLogsByCustomer(session.customerId),
  ])

  const grievanceOfficerName = process.env.GRIEVANCE_OFFICER_NAME
  const grievanceOfficerEmail = process.env.GRIEVANCE_OFFICER_EMAIL
  const grievanceOfficerPhone = process.env.GRIEVANCE_OFFICER_PHONE
  const grievanceConfigured = Boolean(grievanceOfficerName && grievanceOfficerEmail)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-dark">My Privacy</h1>
        <p className="mt-2 text-muted">
          Your rights under India&apos;s Digital Personal Data Protection Act, 2023.
        </p>
      </div>

      <div className="flex flex-col gap-8">

        {/* ── Your data on file ─────────────────────────────── */}
        <section aria-labelledby="data-summary-heading" className="card p-6">
          <h2 id="data-summary-heading" className="mb-4 text-lg font-semibold text-dark">
            Your Data on File
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Account email</dt>
              <dd className="font-medium text-dark">{customer?.email ?? 'Not available'}</dd>
            </div>
            <div>
              <dt className="text-muted">Prescriptions</dt>
              <dd className="font-medium text-dark">
                {prescriptions.length} {prescriptions.length === 1 ? 'prescription' : 'prescriptions'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Orders</dt>
              <dd className="font-medium text-dark">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
              </dd>
            </div>
          </dl>
        </section>

        {/* ── Access & portability ──────────────────────────── */}
        <section aria-labelledby="access-heading" className="card p-6">
          <h2 id="access-heading" className="mb-2 text-lg font-semibold text-dark">
            Access &amp; Portability
          </h2>
          <p className="mb-4 text-sm text-muted">
            Request a copy of the personal data we hold about you.
          </p>
          <a
            href={mailto('Data access request', 'I would like a copy of my personal data held by VisionNova.')}
            className="btn-secondary text-sm"
          >
            Request My Data
          </a>
        </section>

        {/* ── Correction & erasure ──────────────────────────── */}
        <section aria-labelledby="erasure-heading" className="card p-6">
          <h2 id="erasure-heading" className="mb-2 text-lg font-semibold text-dark">
            Correction &amp; Erasure
          </h2>
          <p className="mb-4 text-sm text-muted">
            Ask us to correct inaccurate account details, or delete your account and
            associated data.
          </p>
          <a
            href={mailto('Account deletion request', 'I would like my VisionNova account and associated data deleted.')}
            className="btn-secondary text-sm"
          >
            Delete My Account
          </a>
        </section>

        {/* ── Consent ────────────────────────────────────────── */}
        <section aria-labelledby="consent-heading" className="card p-6">
          <h2 id="consent-heading" className="mb-2 text-lg font-semibold text-dark">
            Consent
          </h2>
          <p className="mb-4 text-sm text-muted">
            Prescription review requires your consent, captured once at upload.
          </p>

          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted">No prescriptions on file.</p>
          ) : (
            <ul className="mb-4 flex flex-col gap-2">
              {prescriptions.map((rx, index) => (
                <li key={rx.id} className="flex items-center justify-between text-sm">
                  <span className="text-dark">Prescription #{index + 1}</span>
                  <span data-testid={`consent-status-${rx.id}`} className="text-muted">
                    {consentStatusLabel(rx.consentGivenAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <a
            href={mailto('Consent withdrawal request', 'I would like to withdraw consent for prescription review.')}
            className="btn-secondary text-sm"
          >
            Withdraw Consent
          </a>

        </section>

        {/* ── Cookie preferences ───────────────────────────── */}
        {/* Analytics consent is separate from prescription-review consent:
            different purpose, different lawful basis, and this one is
            self-service because it has to be — DPDP requires withdrawal to be
            as easy as giving.

            TODO (B4): the mockup offered four toggles — essential, analytics,
            marketing and personalisation. Only analytics ships, because only
            analytics has a consent mechanism behind it. A marketing or
            personalisation switch would set nothing anywhere, which is worse
            than absent: it tells someone exercising a data right that they
            have controlled something they have not. Add each one when the
            category actually exists. */}
        <section aria-labelledby="cookie-prefs-heading" className="card p-6">
          <h2 id="cookie-prefs-heading" className="mb-2 text-lg font-semibold text-dark">
            Cookie Preferences
          </h2>
          <p className="mb-4 text-sm text-muted">
            Analytics cookies only. Changing this takes effect immediately.
          </p>
          <AnalyticsConsentControl />
        </section>

        {/* ── Who has accessed your data ───────────────────── */}
        {/* prescription_access_logs has recorded this all along for the
            review screen and the ops console; nothing surfaced it to the
            person it is about, which is the one place DPDP actually requires
            it. Read straight from the log — no summarising, no rounding. */}
        <section aria-labelledby="access-log-heading" className="card p-6">
          <h2 id="access-log-heading" className="mb-2 text-lg font-semibold text-dark">
            Who Has Accessed Your Data
          </h2>
          <p className="mb-4 text-sm text-muted">
            Every read of your prescriptions is recorded. This is the full trail.
          </p>

          {accessLogs.length === 0 ? (
            <p className="text-sm text-muted">
              No one has accessed your prescription records.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {accessLogs.map((log) => (
                <li key={log.id} className="border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0">
                  <span className="block font-medium text-dark">{log.accessorName}</span>
                  <span className="block text-muted">
                    {log.accessorRole} · viewed{' '}
                    {log.accessType === 'file' ? 'the prescription file' : 'prescription details'}
                    {' · '}
                    {log.accessedAt.toLocaleDateString('en-IN')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Consent history ──────────────────────────────── */}
        <section aria-labelledby="consent-history-heading" className="card p-6">
          <h2 id="consent-history-heading" className="mb-2 text-lg font-semibold text-dark">
            Consent History
          </h2>
          <p className="mb-4 text-sm text-muted">
            When you granted consent for us to process your health data.
          </p>

          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted">No consent events recorded.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {prescriptions.map((rx, index) => (
                <li key={rx.id} className="flex items-center justify-between">
                  <span className="text-dark">
                    Health-data consent · Prescription #{index + 1}
                  </span>
                  <span className="text-muted">
                    {/* A row uploaded before consent capture existed has no
                        timestamp. Rendering "consented" for it would be a
                        fabricated legal record, so it says what is true. */}
                    {rx.consentGivenAt
                      ? rx.consentGivenAt.toLocaleDateString('en-IN')
                      : 'Not recorded'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Grievance Officer ──────────────────────────────── */}
        <section aria-labelledby="grievance-heading" className="card p-6">
          <h2 id="grievance-heading" className="mb-4 text-lg font-semibold text-dark">
            Grievance Officer
          </h2>
          {grievanceConfigured ? (
            <div className="text-sm">
              <p className="font-medium text-dark">{grievanceOfficerName}</p>
              <a href={`mailto:${grievanceOfficerEmail}`} className="text-primary hover:underline">
                {grievanceOfficerEmail}
              </a>
              {grievanceOfficerPhone && (
                <>
                  {' · '}
                  <a href={`tel:${grievanceOfficerPhone}`} className="text-primary hover:underline">
                    {grievanceOfficerPhone}
                  </a>
                </>
              )}
            </div>
          ) : (
            <p role="alert" className="text-sm text-red-600">
              Grievance Officer contact not configured. This is a DPDP requirement —
              set GRIEVANCE_OFFICER_NAME and GRIEVANCE_OFFICER_EMAIL before deploying.
            </p>
          )}
        </section>

        <Link href="/account" className="text-sm font-medium text-primary hover:text-teal">
          ← Back to Account
        </Link>

      </div>
    </main>
  )
}
