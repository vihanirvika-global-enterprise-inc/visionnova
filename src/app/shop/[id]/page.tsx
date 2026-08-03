import Link from 'next/link'
import { getProductById } from '@/lib/products'
import { getProductImages } from '@/lib/productImages'
import { AddToCartButton } from '@/components/ui/AddToCartButton'
import { ProductGallery } from '@/components/shop/ProductGallery'
import { formatPrice } from '@/lib/formatters'

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
          <p className="mt-2 text-2xl font-bold text-primary">{formatPrice(product.price)}</p>

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
