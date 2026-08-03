export default function CatalogLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full animate-pulse rounded bg-slate-200 sm:max-w-sm" />
        <div className="h-10 w-40 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="mb-4 h-4 w-24 animate-pulse rounded bg-slate-200" />

      {/* Same grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 as ProductGrid, so
          the real content doesn't shift the layout when it replaces this. */}
      <div
        role="status"
        aria-label="Loading products"
        className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4"
      >
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="card overflow-hidden">
            <div className="aspect-video animate-pulse bg-slate-200" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-8 w-full animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
