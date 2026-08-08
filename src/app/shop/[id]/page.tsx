import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductById } from '@/lib/products'
import { getProductImages } from '@/lib/productImages'
import { AddToCartButton } from '@/components/ui/AddToCartButton'
import { WishlistButton } from '@/components/ui/WishlistButton'
import { ProductGallery } from '@/components/shop/ProductGallery'
import { LensBuilder } from '@/components/shop/LensBuilder'
import { TryOnPreview } from '@/components/shop/TryOnPreview'
import { formatPrice } from '@/lib/formatters'

interface ProductPageProps {
  params: { id: string }
}

// products.id is a uuid column, so a malformed segment reached Postgres as a
// raw string and threw `invalid input syntax for type uuid` — an unhandled DB
// error served through global-error.tsx as a 200, before notFound() was ever
// reached. Checking the shape first means a junk id never touches the query.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function findProductOr404(id: string) {
  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const product = await getProductById(id)
  if (!product) {
    notFound()
  }

  // notFound() throws, so nothing below runs for a missing product. It is
  // called outside any try/catch on purpose: NEXT_NOT_FOUND travels as a
  // thrown error, and a catch anywhere on this path would swallow it and let
  // the page fall through to a 200.
  return product
}

// Every product page previously inherited the root <title>, on the most-linked
// page type in the site. Both fields come straight from the row: a generated
// description would be marketing copy nobody approved, on a listing for a
// medical device. A product with no description gets none.
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await findProductOr404(params.id)

  return {
    title: product.name,
    ...(product.description ? { description: product.description } : {}),
  }
}

function CheckIcon() {
  return (
    <svg aria-hidden="true"
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await findProductOr404(params.id)

  const images = await getProductImages(product.id)

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

      {/* Back link */}
      <Link
        href="/shop"
        className="mb-8 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary"
      >
        ← Back to Shop
      </Link>

      {/* Two-column layout */}
      <div className="grid gap-12 md:grid-cols-2 md:items-start">

        {/* ── Left: image gallery ──────────────────────────────── */}
        <ProductGallery images={images} fallbackUrl={product.imageUrl} productName={product.name} />

        {/* ── Right: details ────────────────────────────────── */}
        <div className="flex flex-col">

          <h1 className="text-3xl font-bold text-dark">{product.name}</h1>
          {product.requiresPrescription ? null : (
            <p className="mt-2 text-2xl font-bold text-primary">{formatPrice(product.price)}</p>
          )}

          {product.requiresPrescription && (
            <span className="mt-3 inline-block w-fit rounded-full bg-gold px-3 py-1 text-xs text-white">
              Requires Prescription
            </span>
          )}

          <div className="mt-4 text-sm">
            {product.stockQuantity > 0 ? (
              <span className="flex items-center gap-1.5 font-medium text-green-700">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                In Stock
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-slate-300" />
                Out of Stock
              </span>
            )}
          </div>

          {product.requiresPrescription && (
            <div className="mt-4">
              <LensBuilder basePrice={product.price} />
            </div>
          )}

          <div className="mt-4">
            <TryOnPreview frameImageUrl={product.imageUrl} productName={product.name} />
          </div>

          <hr className="my-6 border-slate-100" />

          {product.description ? (
            <p
              data-testid="product-description"
              className="text-base leading-relaxed text-muted"
            >
              {product.description}
            </p>
          ) : (
            <p className="text-base leading-relaxed text-muted">
              No description available.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {product.stockQuantity > 0 && <AddToCartButton product={product} />}
            {/* Rendered even out of stock: saving something you cannot buy yet
                is the main reason a wishlist exists. Inline placement, because
                the card variant is absolutely positioned and would float over
                the gallery in this layout. */}
            <WishlistButton product={product} placement="inline" />
          </div>

          {/* TODO (A5): the mockup also carried ratings and a review list, a
              millimetre frame-dimension table, colour swatches and a
              struck-through MRP. None of them ships, and none is an oversight:
                - reviews: no table. drop-optometrist-reviews.sql removed the
                  only one that existed. Inventing "4.8 from 812 reviews" is a
                  fabricated trust signal on a medical device.
                - dimensions: no lens-width/bridge/temple columns on `products`.
                - colour swatches: would come from product_variants, a table
                  with zero accessors anywhere in src/.
                - MRP / "40% off": no MRP column, and a struck-through price is
                  a representation under the Legal Metrology (Packaged
                  Commodities) Rules.
              All four are bundled with the product-attributes schema task, to
              be built against real data. A guard in page.test.tsx asserts none
              of them creeps back in. */}

          {/* Policy text mirrors /help exactly (return window depends on
              requiresPrescription there too) so the two pages never
              disagree — full detail lives on /help, not duplicated here. */}
          <div className="mt-6 flex flex-col gap-3 rounded-xl bg-surface p-4 text-sm">
            <div className="flex items-start gap-2">
              <CheckIcon />
              <p className="text-dark">
                {product.requiresPrescription ? '14-day returns' : '30-day returns'} on this item.{' '}
                <Link href="/help" className="font-medium text-primary hover:underline">
                  See full policy
                </Link>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckIcon />
              <p className="text-dark">Free return shipping — we&apos;ll email a prepaid label.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckIcon />
              <p className="text-dark">Typically delivered in 5–7 business days.</p>
            </div>
          </div>

        </div>
      </div>

    </main>
  )
}
