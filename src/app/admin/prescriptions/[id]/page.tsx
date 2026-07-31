import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPrescriptionById, getReviewLogsByPrescription } from '@/lib/prescriptions'
import { reviewPrescription } from './actions'

export default async function ReviewPrescriptionPage({ params }: { params: { id: string } }) {
  const [prescription, logs] = await Promise.all([
    getPrescriptionById(params.id),
    getReviewLogsByPrescription(params.id),
  ])
  if (!prescription) notFound()

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
          <a
            href={`/api/prescriptions/${prescription.id}/file`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-primary hover:underline"
          >
            View prescription
          </a>
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
