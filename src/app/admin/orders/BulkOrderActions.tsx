'use client'

import { useState, useTransition } from 'react'
import { bulkUpdateOrders } from './actions'

// Restricted to statuses that make sense for admins to batch-apply from the
// dispatch queue. 'shipped'/'delivered' stay on the single-order form below,
// which is the only place that collects the carrier/tracking a shipment
// actually needs — see bulkUpdateOrderStatus in @/lib/orders.
const BULK_STATUS_OPTIONS = [
  { value: 'processing', label: 'Processing' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

interface BulkOrderActionsProps {
  orderIds: string[]
}

export default function BulkOrderActions({ orderIds }: BulkOrderActionsProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [status, setStatus] = useState<string>(BULK_STATUS_OPTIONS[0].value)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (orderIds.length === 0) return null

  const allSelected = selected.length === orderIds.length

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    setSelected(allSelected ? [] : orderIds)
  }

  function apply() {
    setError(null)
    const formData = new FormData()
    formData.set('orderIds', selected.join(','))
    formData.set('status', status)
    startTransition(async () => {
      const result = await bulkUpdateOrders(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="card mt-6 flex flex-wrap items-center gap-3 p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-dark">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          aria-label="Select all orders"
        />
        Select all
      </label>

      <ul className="flex flex-wrap gap-3">
        {orderIds.map((id) => (
          <li key={id}>
            <label className="flex items-center gap-1 text-xs text-muted">
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={() => toggle(id)}
                aria-label={`Select order ${id}`}
              />
              {id}
            </label>
          </li>
        ))}
      </ul>

      <label htmlFor="bulk-status" className="text-sm font-medium text-dark">
        Set status
      </label>
      <select
        id="bulk-status"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="input-field"
      >
        {BULK_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="btn-primary"
        disabled={selected.length === 0 || isPending}
        onClick={apply}
      >
        Apply to {selected.length} selected
      </button>

      {error ? (
        <p role="alert" className="w-full text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
