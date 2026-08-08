import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { OPS_CONSOLE_ROLES } from '@/lib/roles'
import { getRecentAccessLogs } from '@/lib/prescriptionAccessLogs'
import type { PrescriptionAccessType } from '@/lib/prescriptionAccessLogs'
import { getRegulatoryRiskStatus } from '@/lib/regulatoryRiskStatus'

export const dynamic = 'force-dynamic'

// Plain language for a subject-access response: 'file' and 'metadata' are
// storage terms, not something a patient asking "who saw my data" should
// have to interpret.
const ACCESS_TYPE_LABELS: Record<PrescriptionAccessType, string> = {
  file: 'Prescription file',
  metadata: 'Patient record',
}

// ST-029 Compliance & Audit-Log console: the same "who read what, and when"
// trail as the per-prescription access log, but spanning every prescription
// — the view a DPDP auditor needs, rather than one filed against a single
// subject-access request.
export default async function CompliancePage() {
  const session = getSession()

  // Middleware gates the ops console, but this page names staff and patients
  // across every prescription, so it re-checks rather than trusting a matcher
  // stays correct. OPS_CONSOLE_ROLES, not REVIEWER_ROLES: this is an
  // operations view of who read what, not a clinical one.
  if (!session || !OPS_CONSOLE_ROLES.includes(session.role)) {
    notFound()
  }

  const logs = await getRecentAccessLogs()
  const riskItems = getRegulatoryRiskStatus()

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-dark">Compliance & Audit Log</h1>

      {/* EP-010 BUG-001/005/012: these are regulatory/vendor/staffing
          decisions, not code — this section can only make them impossible
          to miss until a real business action closes them. */}
      <section className="mt-6" aria-labelledby="risk-register-heading">
        <h2 id="risk-register-heading" className="text-lg font-semibold text-dark">
          Regulatory Risk Register
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {riskItems.map((item) => (
            <div
              key={item.id}
              className={`card flex items-start justify-between gap-4 p-4 ${item.configured ? '' : 'border-red-200'}`}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {item.riskRef}
                </p>
                <p className="text-sm font-medium text-dark">{item.label}</p>
                {item.configured ? (
                  <p className="mt-1 text-xs text-muted">{item.detail}</p>
                ) : (
                  <p role="alert" className="mt-1 text-xs text-red-700">
                    {item.detail}
                  </p>
                )}
              </div>
              <span
                className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  item.configured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {item.configured ? 'Configured' : 'Not configured'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <h2 className="mt-10 text-lg font-semibold text-dark">Prescription Access Log</h2>
      <p className="mt-1 text-sm text-muted">
        Every read of a prescription, across every patient, most recent first.
      </p>

      {logs.length === 0 ? (
        <p className="card mt-8 p-6 text-muted">No prescription access recorded yet.</p>
      ) : (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Prescription access log, all patients</caption>
            <thead>
              <tr className="border-b border-slate-200">
                <th scope="col" className="p-4 font-medium text-dark">Accessed by</th>
                <th scope="col" className="p-4 font-medium text-dark">Role</th>
                <th scope="col" className="p-4 font-medium text-dark">Patient</th>
                <th scope="col" className="p-4 font-medium text-dark">What was read</th>
                <th scope="col" className="p-4 font-medium text-dark">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  data-testid={`access-log-${log.id}`}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="p-4 text-dark">{log.accessorName}</td>
                  <td className="p-4 text-muted">{log.accessorRole}</td>
                  <td className="p-4 text-muted">{log.patientName}</td>
                  <td className="p-4 text-muted">
                    <Link
                      href={`/admin/prescriptions/${log.prescriptionId}`}
                      className="text-primary hover:underline"
                    >
                      {ACCESS_TYPE_LABELS[log.accessType]} · {log.prescriptionId}
                    </Link>
                  </td>
                  <td className="p-4 text-muted">
                    <time dateTime={log.accessedAt.toISOString()}>
                      {log.accessedAt.toLocaleString('en-IN')}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
