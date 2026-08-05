'use client'

import { useState, useEffect, type ChangeEvent } from 'react'
import { LENS_TYPES, LENS_COATINGS } from '@/lib/lensOptions'
import { formatPrice } from '@/lib/formatters'

interface LensBuilderProps {
  basePrice: number
  onPriceChange?: (total: number) => void
}

// ST-005 (A5. PDP — "lens builder price recalculates"). Recalculates the
// displayed price only. Not wired into Add to Cart / checkout: cart items
// are keyed by product id with no per-line customization, so persisting a
// lens config through cart -> order needs its own line-item data model —
// a materially bigger, separate change. Stated gap, not silently dropped.
export function LensBuilder({ basePrice, onPriceChange }: LensBuilderProps) {
  const [lensTypeId, setLensTypeId] = useState(LENS_TYPES[0].id)
  const [coatingId, setCoatingId] = useState(LENS_COATINGS[0].id)

  const lensType = LENS_TYPES.find((option) => option.id === lensTypeId) ?? LENS_TYPES[0]
  const coating = LENS_COATINGS.find((option) => option.id === coatingId) ?? LENS_COATINGS[0]
  const total = basePrice + lensType.priceModifier + coating.priceModifier

  useEffect(() => {
    onPriceChange?.(total)
    // onPriceChange is a parent-supplied callback, not reactive state this
    // effect should re-run for — only the computed total should retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  function handleLensTypeChange(e: ChangeEvent<HTMLSelectElement>) {
    setLensTypeId(e.target.value)
  }

  function handleCoatingChange(e: ChangeEvent<HTMLSelectElement>) {
    setCoatingId(e.target.value)
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface p-4">
      <p className="text-sm font-semibold text-dark">Build Your Lenses</p>

      <div className="flex flex-col gap-1">
        <label htmlFor="lens-type" className="text-sm text-muted">
          Lens Type
        </label>
        <select
          id="lens-type"
          value={lensTypeId}
          onChange={handleLensTypeChange}
          className="input-field text-sm"
        >
          {LENS_TYPES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
              {option.priceModifier > 0 ? ` (+${formatPrice(option.priceModifier)})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="lens-coating" className="text-sm text-muted">
          Coating
        </label>
        <select
          id="lens-coating"
          value={coatingId}
          onChange={handleCoatingChange}
          className="input-field text-sm"
        >
          {LENS_COATINGS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
              {option.priceModifier > 0 ? ` (+${formatPrice(option.priceModifier)})` : ''}
            </option>
          ))}
        </select>
      </div>

      <p className="text-lg font-bold text-primary">{formatPrice(total)}</p>
    </div>
  )
}
