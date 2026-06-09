import Link from 'next/link'
import { getProductById } from '@/lib/products'
import { AddToCartButton } from '@/components/ui/AddToCartButton'

interface ProductPageProps {
  params: { id: string }
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

        {/* ── Left: image ───────────────────────────────────── */}
        <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-cyan-400">
              <svg
                className="h-24 w-24 text-white opacity-40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* ── Right: details ────────────────────────────────── */}
        <div className="flex flex-col">

          <h1 className="text-3xl font-bold text-dark">{product.name}</h1>
          <p className="mt-2 text-2xl font-bold text-primary">${product.price.toFixed(2)}</p>

          {product.requiresPrescription && (
            <span className="mt-3 inline-block w-fit rounded-full bg-gold px-3 py-1 text-xs text-white">
              Requires Prescription
            </span>
          )}

          <div className="mt-4 text-sm">
            {product.stockQuantity > 0 ? (
              <span className="flex items-center gap-1.5 font-medium text-green-600">
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

        </div>
      </div>

    </main>
  )
}
