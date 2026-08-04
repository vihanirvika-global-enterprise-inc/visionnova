import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { REVIEWER_ROLES } from '@/lib/prescriptionAccess'
import { listPendingPartners } from '@/lib/optometristPartners'
import { reviewPartnerKyc } from './actions'

export const dynamic = 'force-dynamic'

// ST-021 (C1. Optometrist Onboarding — KYC review).
export default async function AdminPartnersPage() {
  const session = getSession()

  if (!session || !REVIEWER_ROLES.includes(session.role)) {
    notFound()
  }

  const partners = await listPendingPartners()

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-dark">Partner KYC Review Queue</h1>
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-semibold text-white">
          {partners.length}
        </span>
      </div>

      {partners.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted">No pending partner applications</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {partners.map((partner) => (
            <div key={partner.id} className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-dark">{partner.clinicName}</p>
                  <p className="mt-1 text-sm text-dark">{partner.customerName}</p>
                  <p className="text-sm text-muted">{partner.customerEmail}</p>
                  <p className="mt-2 text-xs text-muted">
                    Submitted {partner.createdAt.toLocaleDateString('en-IN')}
                  </p>
                  <a
                    href={`/api/kyc/${partner.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                  >
                    View KYC Document
                  </a>
                </div>

                <div className="flex flex-col gap-2">
                  <form action={reviewPartnerKyc}>
                    <input type="hidden" name="partnerId" value={partner.id} />
                    <input type="hidden" name="status" value="verified" />
                    <button type="submit" className="btn-primary px-4 text-sm">
                      Approve
                    </button>
                  </form>
                  <form action={reviewPartnerKyc}>
                    <input type="hidden" name="partnerId" value={partner.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button type="submit" className="btn-secondary px-4 text-sm">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
