import type { Metadata } from 'next'
import { getPartnerStores } from '@/lib/stores'

export const metadata: Metadata = {
  title: 'Store Locator',
  description: 'Find VisionNova partner stores near you.',
}

interface StoresPageProps {
  searchParams: { city?: string }
}

// ST-014 (A14. Store Locator — Partner). List view, no embedded map: no
// mapping/geocoding provider is configured anywhere in this repo, and picking
// one is an external-vendor decision, not a code gap — see scoping decision
// in conversation. This ships the real, working part: a searchable partner
// store directory.
export default async function StoresPage({ searchParams }: StoresPageProps) {
  const city = searchParams.city?.trim() || undefined
  const stores = await getPartnerStores(city)

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-dark">Find a Partner Store</h1>
        <p className="mt-2 text-muted">VisionNova partner stores across India</p>
      </div>

      <form method="get" role="search" className="mb-6 flex gap-2 sm:max-w-sm">
        <label htmlFor="store-city" className="sr-only">
          Search by city
        </label>
        <input
          id="store-city"
          name="city"
          type="search"
          defaultValue={city ?? ''}
          placeholder="Search by city..."
          className="input-field flex-1"
        />
        <button type="submit" className="btn-secondary px-4 text-sm">
          Search
        </button>
      </form>

      <p role="status" className="mb-4 text-sm text-muted">
        {stores.length} {stores.length === 1 ? 'store' : 'stores'}
        {city ? ` in "${city}"` : ''}
      </p>

      {stores.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <svg aria-hidden="true"
            className="h-16 w-16 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <p className="mt-4 text-lg text-muted">
            {city ? `No stores found in "${city}"` : 'No partner stores listed yet'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {stores.map((store) => (
            <div key={store.id} className="card p-6">
              <p className="text-lg font-semibold text-dark">{store.name}</p>
              <p className="mt-1 text-sm text-muted">
                {store.addressLine1}
                {store.addressLine2 ? `, ${store.addressLine2}` : ''}, {store.city}, {store.state} {store.postalCode}
              </p>
              {store.phone && <p className="mt-2 text-sm text-primary">{store.phone}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
