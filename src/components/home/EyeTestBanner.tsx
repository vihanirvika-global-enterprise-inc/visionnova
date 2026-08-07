import Link from 'next/link'

// The mockup paired this with a "Virtual try-on" banner. Static-photo try-on
// is in the MVP scope (CLAUDE.md) but has no route under src/app yet, so that
// half is omitted rather than shipped as a link to a 404 — same call as the
// deferred Corporate nav item. Add it back when the screen lands.
//
// No price claim: the mockup's "Free video eye test — ₹0 for first-time
// customers" is not established anywhere in this repo, and eye_test_appointments
// carries no fee column to check it against.
export function EyeTestBanner() {
  return (
    <section
      aria-labelledby="eye-test-heading"
      className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
    >
      <div className="card flex flex-col items-start gap-4 border-primary/30 bg-surface p-8 sm:flex-row sm:items-center sm:gap-8">
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary ring-1 ring-primary/20">
          <svg aria-hidden="true" className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </span>

        <div className="flex-1">
          <h2 id="eye-test-heading" className="text-xl font-semibold text-dark">
            Book an eye test
          </h2>
          <p className="mt-1 text-sm text-muted">
            Arrange a consultation with a partner optometrist and have your
            prescription verified before you order.
          </p>
        </div>

        <Link href="/eye-test" className="btn-primary whitespace-nowrap">
          Book a slot
        </Link>
      </div>
    </section>
  )
}
