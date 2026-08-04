import Link from 'next/link'
import { getInStockProducts } from '@/lib/products'
import { ProductGrid } from '@/components/ui/ProductGrid'

// ST-001 (A1. Homepage): hero, trust strip, and a live product grid wired to
// getInStockProducts — verified against the ticket, not just carried over
// from its "Done" status.
export default async function HomePage() {
  const products = await getInStockProducts()

  return (
    <main>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-surface py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 md:grid-cols-2">

            {/* Copy */}
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl font-bold tracking-tight text-dark md:text-5xl">
                Seeing the World Clearly, Together
              </h1>
              <p className="text-lg leading-relaxed text-muted">
                Premium prescription eyewear from ₹799. Delivered across India.
                Verified by licensed optometrists.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/shop" className="btn-primary">
                  Shop Eyeglasses
                </Link>
                {/* Deliberately "Upload Prescription", not "How it works": a
                    direct-action CTA outperforms an educational deflection for
                    a site whose whole value prop is prescription eyewear
                    delivered — /help already covers "how it works" for
                    anyone who wants that instead. */}
                <Link href="/prescription-upload" className="btn-secondary">
                  Upload Prescription
                </Link>
              </div>
            </div>

            {/* Hero image placeholder */}
            <div className="mx-auto w-full max-w-sm">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary to-teal" />
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-around">

            <div className="flex flex-col items-center gap-2 text-center">
              <svg aria-hidden="true" className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
              <span className="text-sm font-semibold text-dark">Licensed Optometrists</span>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <svg aria-hidden="true" className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-sm font-semibold text-dark">Prescription Verified</span>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <svg aria-hidden="true" className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="text-sm font-semibold text-dark">30-Day Returns</span>
            </div>

          </div>
        </div>
      </section>

      {/* ── Why VisionNova ───────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center">Why VisionNova</h2>
          <div className="grid gap-8 sm:grid-cols-3">

            <div className="flex flex-col items-center gap-2 text-center">
              <svg aria-hidden="true" className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              <span className="text-sm font-semibold text-dark">Premium Quality</span>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <svg aria-hidden="true" className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-semibold text-dark">Optometrist-Checked</span>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <svg aria-hidden="true" className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="text-sm font-semibold text-dark">Easy 30-Day Returns</span>
            </div>

          </div>
        </div>
      </section>

      {/* ── New arrivals ─────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2>New Arrivals</h2>
            <Link href="/shop" className="text-sm font-medium text-primary hover:text-teal">
              View All →
            </Link>
          </div>
          <ProductGrid products={products} />
        </div>
      </section>

    </main>
  )
}
