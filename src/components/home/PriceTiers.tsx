import Link from 'next/link'
import { formatPrice } from '@/lib/formatters'

// Bands are approved business copy (A1). They are rendered through the shared
// formatPrice so the ₹ grouping matches every other price on the site — never
// hand-typed as "₹2,499".
//
// Settled at A2: these link to an unfiltered /shop, and that is the final
// answer for now rather than a placeholder. A price filter would sort the
// catalogue into these three bands, but every seeded product is ₹35–₹150
// against a ₹999 floor, so the Budget tile would hold all eight and the other
// two would be empty — a filter that makes the data's problem look like a
// product's. Revisit with the catalogue reprice, not before.
const TIERS = [
  {
    name: 'Budget',
    min: 999,
    max: 2499,
    description: 'Everyday frames with single-vision lenses included.',
  },
  {
    name: 'Standard',
    min: 2500,
    max: 6000,
    description: 'Premium acetate and metal, with blue-cut and thin-index options.',
  },
  {
    name: 'Premium',
    min: 6000,
    max: null,
    description: 'Titanium and rimless lines with our finest coatings.',
  },
] as const

function band(min: number, max: number | null): string {
  return max === null ? `${formatPrice(min)}+` : `${formatPrice(min)} – ${formatPrice(max)}`
}

export function PriceTiers() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-2" id="shop-by-price">Shop by price</h2>
        <p className="mb-8 text-muted">Every budget, one standard of clarity.</p>

        <ul aria-labelledby="shop-by-price" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <li key={tier.name}>
              {/* aria-labelledby, not the wrapped text: without it the link's
                  accessible name is the whole tile including the description,
                  which reads as a paragraph in a link list. */}
              <Link
                href="/shop"
                aria-labelledby={`tier-${tier.name}-name tier-${tier.name}-band`}
                className="card flex h-full flex-col gap-2 p-6 transition-shadow hover:shadow-md"
              >
                <span id={`tier-${tier.name}-band`} className="text-sm font-medium text-primary">
                  {band(tier.min, tier.max)}
                </span>
                <span id={`tier-${tier.name}-name`} className="text-xl font-semibold text-dark">
                  {tier.name}
                </span>
                <span className="text-sm text-muted">{tier.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
