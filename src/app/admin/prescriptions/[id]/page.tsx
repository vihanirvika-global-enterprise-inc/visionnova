import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { REVIEWER_ROLES, readPrescriptionMetadataForSession } from '@/lib/prescriptionAccess'
import { getReviewLogsByPrescription } from '@/lib/prescriptions'
import { reviewPrescription } from './actions'

export const dynamic = 'force-dynamic'

export default async function ReviewPrescriptionPage({ params }: { params: { id: string } }) {
  const session = getSession()

  // Middleware gates /admin, but this screen names the patient and shows their
  // email, so the page re-checks rather than trusting a matcher stays correct.
  if (!session || !REVIEWER_ROLES.includes(session.role)) {
    notFound()
  }

  // Read through the audited door, not getPrescriptionById: opening this
  // screen is itself a read of health data and must leave a trail entry. A
  // denial — including an unwritable audit log — must not render.
  const [access, logs] = await Promise.all([
    readPrescriptionMetadataForSession(params.id, session),
    getReviewLogsByPrescription(params.id),
  ])
  if (!access.ok) notFound()

  const prescription = access.prescription

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/admin/prescriptions" className="text-sm text-muted hover:underline">
          ← Back to queue
        </Link>
      </div>

      <h1 className="mb-6 text-dark">Review Prescription</h1>

      <div className="card p-6 space-y-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Patient</p>
          <p className="mt-1 font-medium text-dark">{prescription.customerName}</p>
          <p className="text-sm text-muted">{prescription.customerEmail}</p>
        </div>

        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Submitted</p>
          <p className="mt-1 text-sm text-dark">{prescription.createdAt.toLocaleDateString()}</p>
        </div>

        <div>
          <p className="text-xs text-muted uppercase tracking-wide">File</p>
          {/* ST-023: a digitally-authored prescription (Digital Rx Writing
              Tool) has no uploaded document — there is nothing to open. */}
          {prescription.fileUrl ? (
            <a
              href={`/api/prescriptions/${prescription.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-primary hover:underline"
            >
              View prescription
            </a>
          ) : (
            <p className="mt-1 text-sm text-muted">Authored digitally — no file on record</p>
          )}
        </div>

        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Audit</p>
          {/* Every read is logged; this is how that trail is answered without
              a database query. */}
          <Link
            href={`/admin/prescriptions/${prescription.id}/access-log`}
            className="mt-1 inline-block text-sm text-primary hover:underline"
          >
            Access log
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-start gap-4">
        <form action={reviewPrescription}>
          <input type="hidden" name="prescriptionId" value={prescription.id} />
          <input type="hidden" name="action" value="approved" />
          <button type="submit" className="btn-primary">
            Approve
          </button>
        </form>

        <form action={reviewPrescription} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="prescriptionId" value={prescription.id} />
          <input type="hidden" name="action" value="rejected" />
          <select name="rejectionReason" className="input text-sm">
            <option value="illegible">Illegible</option>
            <option value="expired">Expired</option>
            <option value="incomplete">Incomplete</option>
            <option value="mismatch">Mismatch</option>
          </select>
          <textarea
            name="note"
            placeholder="Optional note…"
            rows={1}
            className="input text-sm"
          />
          <button type="submit" className="btn-secondary text-red-600 border-red-300 hover:bg-red-50">
            Reject
          </button>
        </form>
      </div>

      {logs.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-base font-semibold text-dark">Review History</h2>
          <div className="card overflow-hidden">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between border-b border-slate-100 px-6 py-4 last:border-0">
                <div>
                  <span className="font-medium text-dark">{log.reviewerName}</span>
                  <span className="ml-2 text-sm text-muted">{log.action}</span>
                  {log.rejectionReason && (
                    <span className="ml-2 text-xs text-muted">({log.rejectionReason})</span>
                  )}
                  {log.note && <p className="mt-0.5 text-xs text-muted">{log.note}</p>}
                </div>
                <span className="text-xs text-muted">{log.createdAt.toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
