import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getPrescriptionById } from '@/lib/prescriptions'
import { getAccessLogsByPrescription } from '@/lib/prescriptionAccessLogs'
import type { PrescriptionAccessType } from '@/lib/prescriptionAccessLogs'

export const dynamic = 'force-dynamic'

const REVIEWER_ROLES = ['optometrist', 'admin']

// Plain language for a subject-access response: 'file' and 'metadata' are
// storage terms, not something a patient asking "who saw my data" should
// have to interpret.
const ACCESS_TYPE_LABELS: Record<PrescriptionAccessType, string> = {
  file: 'Prescription file',
  metadata: 'Patient record',
}

// Answers "who has read this prescription, and when" for a DPDP subject-access
// request, without anyone needing database access.
export default async function AccessLogPage({ params }: { params: { id: string } }) {
  const session = getSession()

  // Middleware gates /admin, but the trail names staff who viewed health data,
  // so the page re-checks rather than trusting a matcher stays correct.
  if (!session || !REVIEWER_ROLES.includes(session.role)) {
    notFound()
  }

  const prescription = await getPrescriptionById(params.id)
  if (!prescription) {
    notFound()
  }

  const logs = await getAccessLogsByPrescription(prescription.id)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/admin/prescriptions/${prescription.id}`}
        className="text-sm text-primary hover:underline"
      >
        ← Back to prescription
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-dark">
        Access log — prescription {prescription.id}
      </h1>
      <p className="mt-1 text-sm text-muted">
        Every read of this prescription, most recent first.
      </p>

      {logs.length === 0 ? (
        <p className="card mt-8 p-6 text-muted">
          No one has accessed this prescription file yet.
        </p>
      ) : (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Access log for prescription {prescription.id}
            </caption>
            <thead>
              <tr className="border-b border-slate-200">
                <th scope="col" className="p-4 font-medium text-dark">Accessed by</th>
                <th scope="col" className="p-4 font-medium text-dark">Role</th>
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
                  <td className="p-4 text-muted">{ACCESS_TYPE_LABELS[log.accessType]}</td>
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
