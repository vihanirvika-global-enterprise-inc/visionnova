import Link from 'next/link'
import { getPendingPrescriptions } from '@/lib/prescriptions'

export default async function AdminPrescriptionsPage() {
  const prescriptions = await getPendingPrescriptions()

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-dark">Prescription Review Queue</h1>
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-semibold text-white">
          {prescriptions.length}
        </span>
      </div>

      {prescriptions.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted">No pending prescriptions</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-muted">Patient</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Email</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Submitted</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr key={rx.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-6 py-4 font-medium text-dark">{rx.customerName}</td>
                  <td className="px-6 py-4 text-muted">{rx.customerEmail}</td>
                  <td className="px-6 py-4 text-muted">{rx.createdAt.toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/prescriptions/${rx.id}`}
                      className="text-primary hover:underline"
                    >
                      Review
                    </Link>
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
