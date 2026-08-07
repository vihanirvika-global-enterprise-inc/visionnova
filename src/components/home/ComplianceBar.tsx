// A1: the four compliance claims that carry across the storefront. The
// statutory *numbers* that back them (GSTIN, CIN, CDSCO licence) are
// deliberately not rendered anywhere — see the TODO in Footer.tsx. A
// placeholder shaped like a real licence number is worse than no number at
// all: it reads as a claim we cannot substantiate.
const CLAIMS = [
  'Made in India',
  'CDSCO licensed',
  'BIS-certified frames',
  'DPDP compliant',
] as const

export function ComplianceBar() {
  return (
    <div role="note" aria-label="Compliance" className="bg-dark text-slate-200">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2 sm:px-6 lg:px-8">
        {CLAIMS.map((claim) => (
          <span key={claim} className="inline-flex items-center gap-1.5 text-xs">
            <svg aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {claim}
          </span>
        ))}
      </div>
    </div>
  )
}
