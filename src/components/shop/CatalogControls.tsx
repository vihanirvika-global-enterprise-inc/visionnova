'use client'

import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
] as const

export function CatalogControls() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  // Keeps the input in sync with the URL on browser back/forward, where the
  // URL changes without this component re-mounting.
  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  // A new search or sort is a new result set — carrying over a stale page
  // number could point past the end of it.
  function navigate(next: URLSearchParams) {
    next.delete('page')
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault()
    const next = new URLSearchParams(searchParams.toString())
    const trimmed = query.trim()
    if (trimmed) {
      next.set('q', trimmed)
    } else {
      next.delete('q')
    }
    navigate(next)
  }

  function handleSortChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams.toString())
    if (e.target.value === 'newest') {
      next.delete('sort')
    } else {
      next.set('sort', e.target.value)
    }
    navigate(next)
  }

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <form
        onSubmit={handleSearchSubmit}
        role="search"
        className="flex gap-2 sm:max-w-sm sm:flex-1"
      >
        <label htmlFor="catalog-search" className="sr-only">
          Search eyewear
        </label>
        <input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search eyewear..."
          className="input-field flex-1"
        />
        <button type="submit" className="btn-secondary px-4 text-sm">
          Search
        </button>
      </form>

      <div className="flex items-center gap-2">
        <label htmlFor="catalog-sort" className="text-sm text-muted">
          Sort by
        </label>
        <select
          id="catalog-sort"
          value={searchParams.get('sort') ?? 'newest'}
          onChange={handleSortChange}
          className="input-field text-sm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
