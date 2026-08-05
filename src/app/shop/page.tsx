import type { Metadata } from 'next'
import Link from 'next/link'
import { getCatalogProducts, type ProductSort } from '@/lib/products'
import { ProductGrid } from '@/components/ui/ProductGrid'
import { CatalogControls } from '@/components/shop/CatalogControls'

export const metadata: Metadata = {
  title: 'Eyeglasses',
  description: 'Shop premium prescription eyewear from ₹799. Verified by licensed optometrists with free delivery across India.',
}

// ST-002 (A2. Eyeglasses Catalog): search, sort, and pagination are wired to
// getCatalogProducts and verified working. Attribute filtering (frame shape,
// lens type, color) is not implemented — the ticket's "all filters combine
// correctly and persist" AC is only partially met.
const PAGE_SIZE = 12
const VALID_SORTS: ProductSort[] = ['price_asc', 'price_desc', 'newest']

interface CatalogPageProps {
  searchParams: {
    q?: string
    sort?: string
    page?: string
  }
}

function buildHref(params: { q?: string; sort: ProductSort; page?: number }): string {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.sort !== 'newest') qs.set('sort', params.sort)
  if (params.page && params.page > 1) qs.set('page', String(params.page))
  const query = qs.toString()
  return query ? `/shop?${query}` : '/shop'
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const q = searchParams.q?.trim() || undefined
  const sort: ProductSort = VALID_SORTS.includes(searchParams.sort as ProductSort)
    ? (searchParams.sort as ProductSort)
    : 'newest'
  const requestedPage = parseInt(searchParams.page ?? '1', 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1

  const { products, totalCount } = await getCatalogProducts({ q, sort, page, pageSize: PAGE_SIZE })

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasPrev = page > 1
  const hasNext = page < totalPages
  const isEmptySearch = products.length === 0 && !!q

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-dark">Eyeglasses</h1>
        <p className="mt-2 text-muted">
          Browse our full collection — prescription and non-prescription
        </p>
      </div>

      {/* ST-003 / ST-004: the only site-wide links into the sunglasses and
          contact lens catalogs — neither is in the main Navbar. */}
      <nav aria-label="catalog categories" className="mb-6 flex gap-4 text-sm font-medium">
        <Link href="/sunglasses" className="text-primary hover:text-teal">Sunglasses →</Link>
        <Link href="/contacts" className="text-primary hover:text-teal">Contact Lenses →</Link>
      </nav>

      <CatalogControls />

      <p role="status" className="mb-4 text-sm text-muted">
        {totalCount} {totalCount === 1 ? 'result' : 'results'}
        {q ? ` for "${q}"` : ''}
      </p>

      {isEmptySearch ? (
        <div className="flex flex-col items-center py-16 text-center">
          <svg aria-hidden="true"
            className="h-16 w-16 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="mt-4 text-lg text-muted">No results for &quot;{q}&quot;</p>
          <Link
            href={buildHref({ sort, page: undefined })}
            className="mt-2 text-sm font-medium text-primary hover:text-teal"
          >
            Clear search
          </Link>
        </div>
      ) : (
        <>
          <ProductGrid products={products} />

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
              {hasPrev && (
                <Link href={buildHref({ q, sort, page: page - 1 })} className="btn-secondary px-4 text-sm">
                  Previous
                </Link>
              )}
              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>
              {hasNext && (
                <Link href={buildHref({ q, sort, page: page + 1 })} className="btn-secondary px-4 text-sm">
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  )
}
