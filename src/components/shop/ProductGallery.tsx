'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ProductImage } from '@/types'

interface ProductGalleryProps {
  images: ProductImage[]
  fallbackUrl: string | null
  productName: string
}

function PlaceholderImage() {
  return (
    <div
      data-testid="gallery-placeholder"
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-teal"
    >
      <svg aria-hidden="true"
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
  )
}

export function ProductGallery({ images, fallbackUrl, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  // product_images may not be backfilled for every product yet — fall back
  // to the single legacy image (or the placeholder) rather than assuming
  // every product has real gallery rows.
  if (images.length === 0) {
    return (
      <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
        {fallbackUrl ? (
          <Image
            src={fallbackUrl}
            alt={productName}
            width={600}
            height={600}
            className="h-full w-full object-cover"
          />
        ) : (
          <PlaceholderImage />
        )}
      </div>
    )
  }

  const active = images[activeIndex]

  return (
    <div>
      <div
        data-testid="gallery-main-image"
        className="aspect-square overflow-hidden rounded-2xl bg-slate-100"
      >
        <Image
          src={active.url}
          alt={active.alt ?? productName}
          width={600}
          height={600}
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div role="tablist" aria-label="Product images" className="mt-4 flex gap-3">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`View image ${index + 1} of ${images.length}`}
              onClick={() => setActiveIndex(index)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                index === activeIndex ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Image
                src={image.url}
                alt={image.alt ?? `${productName} thumbnail ${index + 1}`}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
