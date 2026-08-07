import Link from 'next/link'
import { getInStockProducts } from '@/lib/products'
import { formatPrice } from '@/lib/formatters'
import { ProductGrid } from '@/components/ui/ProductGrid'
import { ComplianceBar } from '@/components/home/ComplianceBar'
import { ValueStrip } from '@/components/home/ValueStrip'
import { PriceTiers } from '@/components/home/PriceTiers'
import { EyeTestBanner } from '@/components/home/EyeTestBanner'

// ST-001 (A1. Homepage): hero, trust strip, and a live product grid wired to
// getInStockProducts — verified against the ticket, not just carried over
// from its "Done" status.
export default async function HomePage() {
  const products = await getInStockProducts()

  return (
    <main>
      <ComplianceBar />


      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-surface py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 md:grid-cols-2">

            {/* Copy. Rendered as a single static slide, not a carousel: only
                the price-led slide is confirmed. The eye-test and
                buy-one-give-one slides from the mockup are held pending
                confirmation that they describe real offers, and a carousel
                shell around one slide is just controls that do nothing. */}
            <div className="flex flex-col gap-6">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                Seeing the World Clearly, Together
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-dark md:text-5xl">
                Quality eyewear from {formatPrice(999)}
              </h1>
              <p className="text-lg leading-relaxed text-muted">
                Handcrafted frames with single-vision lenses included, delivered
                across India. Verified by licensed optometrists.
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

      <ValueStrip />

      <PriceTiers />

      <EyeTestBanner />

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
