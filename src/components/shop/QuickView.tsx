'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'
import { AddToCartButton } from '@/components/ui/AddToCartButton'
import { formatPrice } from '@/lib/formatters'

// Conditionally rendered rather than a native <dialog>: the native element is
// the better primitive, but its open/closed state is driven by showModal()
// rather than by React, and jsdom's support for it varies by version. A
// hand-rolled dialog keeps the open state in React where the tests can see it,
// at the cost of doing focus and Escape by hand below.
export function QuickView({ product }: { product: Product }) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  // Escape closes, and focus returns to the trigger. Without the restore, a
  // keyboard user who closes the dialog is dropped back at the top of the
  // document and has to tab through the whole catalogue again.
  useEffect(() => {
    if (!open) return

    dialogRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const headingId = `quick-view-${product.id}`
  const inStock = product.stockQuantity > 0

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        // The product name is in the accessible name: a catalogue page renders
        // a dozen of these, and "Quick view" twelve times over is unusable
        // from a screen reader's element list.
        aria-label={`Quick view: ${product.name}`}
        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-dark transition-colors hover:bg-surface"
      >
        Quick view
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark/50 p-4"
          onClick={close}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            tabIndex={-1}
            // Without this the backdrop's onClick fires for clicks inside the
            // panel too, so choosing a quantity would dismiss the dialog.
            onClick={(event) => event.stopPropagation()}
            className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={headingId} className="text-xl font-semibold text-dark">
                {product.name}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close quick view"
                className="flex-shrink-0 rounded-full p-1 text-muted hover:bg-surface hover:text-dark"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 aspect-video overflow-hidden rounded-xl bg-slate-100">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={512}
                  height={288}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-teal">
                  <svg aria-hidden="true" className="h-16 w-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
            </div>

            <p className="mt-4 text-2xl font-bold text-primary">{formatPrice(product.price)}</p>

            {product.description && (
              <p className="mt-2 text-sm text-muted">{product.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {inStock ? (
                <span className="flex items-center gap-1.5 text-green-700">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                  In Stock
                </span>
              ) : (
                <span className="text-muted">Out of Stock</span>
              )}
              {product.requiresPrescription && (
                <span className="rounded-full bg-gold px-2 py-0.5 text-xs text-white">
                  Requires Prescription
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {inStock && (
                <div className="sm:flex-1">
                  <AddToCartButton product={product} />
                </div>
              )}
              <Link href={`/shop/${product.id}`} className="btn-secondary text-center sm:flex-1">
                See full details
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
