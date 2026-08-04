import Image from 'next/image'
import type { Product } from '@/types'
import { AddToCartButton } from './AddToCartButton'
import { WishlistButton } from './WishlistButton'
import { formatPrice } from '@/lib/formatters'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="card relative flex flex-col">

      <WishlistButton product={product} />

      {/* Image area */}
      <div className="aspect-video overflow-hidden rounded-t-xl bg-slate-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={400}
            height={225}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-teal">
            <svg aria-hidden="true"
              className="h-16 w-16 text-white opacity-50"
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

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="truncate text-base font-semibold text-dark">{product.name}</p>
        <p className="text-lg font-bold text-primary">{formatPrice(product.price)}</p>

        {product.requiresPrescription && (
          <span className="w-fit rounded-full bg-gold px-2 py-0.5 text-xs text-white">
            Requires Prescription
          </span>
        )}

        <div className="text-sm">
          {product.stockQuantity > 0 ? (
            <span className="flex items-center gap-1.5 text-green-700">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
              In Stock
            </span>
          ) : (
            <span className="text-muted">Out of Stock</span>
          )}
        </div>

        {product.stockQuantity > 0 && (
          <div className="mt-auto pt-2">
            <AddToCartButton product={product} />
          </div>
        )}
      </div>

    </div>
  )
}
