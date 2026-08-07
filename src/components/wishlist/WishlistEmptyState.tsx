import Link from 'next/link'

// Deliberately not ProductGrid's empty state. That one says "No products
// found", which reads as a failed search — the right message when a filter
// matched nothing, the wrong one here, where nothing has gone wrong and the
// customer simply hasn't saved anything. This variant explains the heart
// affordance instead, because an empty wishlist usually means the customer
// hasn't found it yet.
export function WishlistEmptyState() {
  return (
    <section
      aria-labelledby="wishlist-empty-heading"
      className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 text-slate-400">
        <svg aria-hidden="true" className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      </span>

      <h2 id="wishlist-empty-heading" className="mt-4 text-xl font-semibold text-dark">
        Nothing saved yet
      </h2>
      <p className="mt-2 text-muted">
        Tap the heart on any product to save it for later.
      </p>

      <Link href="/shop" className="btn-primary mt-6">
        Browse eyewear
      </Link>
    </section>
  )
}
