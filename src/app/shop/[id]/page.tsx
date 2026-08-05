import Link from 'next/link'
import { getProductById } from '@/lib/products'
import { getProductImages } from '@/lib/productImages'
import { AddToCartButton } from '@/components/ui/AddToCartButton'
import { ProductGallery } from '@/components/shop/ProductGallery'
import { LensBuilder } from '@/components/shop/LensBuilder'
import { TryOnPreview } from '@/components/shop/TryOnPreview'
import { formatPrice } from '@/lib/formatters'

interface ProductPageProps {
  params: { id: string }
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
  const product = await getProductById(params.id)

  if (!product) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-muted">Product not found</p>
      </main>
    )
  }

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

          {product.stockQuantity > 0 && (
            <div className="mt-6">
              <AddToCartButton product={product} />
            </div>
          )}

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
