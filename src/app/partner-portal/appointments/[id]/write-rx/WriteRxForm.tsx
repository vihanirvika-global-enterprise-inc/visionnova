'use client'

import { useState, useTransition } from 'react'
import { OPTICAL_RANGES } from '@/lib/opticalRanges'
import type { WriteRxFormState } from './actions'
import { writePrescriptionAction } from './actions'

// Every field is optional at the form level — a prescription does not need
// every one filled in (no astigmatism means no cylinder) — and the server
// enforces the clinical ranges in writePrescriptionAction. The hints below
// come from the same constants that validator uses, so the form cannot
// advertise a range the action would reject.
const EYE_FIELDS = [
  { key: 'Sphere', label: 'SPH', range: OPTICAL_RANGES.sphere },
  { key: 'Cylinder', label: 'CYL', range: OPTICAL_RANGES.cylinder },
  { key: 'Axis', label: 'Axis', range: OPTICAL_RANGES.axis },
  { key: 'Add', label: 'Add', range: OPTICAL_RANGES.add },
] as const

const EYES = [
  { key: 'right', label: 'Right (OD)' },
  { key: 'left', label: 'Left (OS)' },
] as const

function rangeHint([min, max]: readonly [number, number]): string {
  return `${min} to ${max}`
}

export function WriteRxForm({ appointmentId }: { appointmentId: string }) {
  const [state, setState] = useState<WriteRxFormState>({})
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setState({})
    startTransition(async () => {
      const result = await writePrescriptionAction(formData)
      if (result?.formError) setState(result)
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6">
      <input type="hidden" name="appointmentId" value={appointmentId} />

      {state.formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.formError}
        </p>
      )}

      {/* A table rather than two stacked cards: OD and OS are read across,
          field by field, and a clinician comparing the two eyes should not
          have to scroll between them. Scrolls horizontally on a narrow
          screen instead of wrapping the columns out of alignment. */}
      <div className="card overflow-x-auto p-6">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="mb-4 text-left font-semibold text-dark">
            Clinical values
          </caption>
          <thead>
            <tr>
              <th scope="col" className="pb-2 text-left font-medium text-muted">Eye</th>
              {EYE_FIELDS.map((field) => (
                <th key={field.key} scope="col" className="pb-2 text-left font-medium text-muted">
                  {field.label}
                  <span className="block text-xs font-normal">{rangeHint(field.range)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EYES.map((eye) => (
              <tr key={eye.key}>
                <th scope="row" className="py-2 pr-4 text-left font-medium text-dark">
                  {eye.label}
                </th>
                {EYE_FIELDS.map((field) => {
                  const name = `${eye.key}${field.key}`
                  return (
                    <td key={name} className="py-2 pr-3">
                      <label htmlFor={name} className="sr-only">
                        {eye.label} {field.label}
                      </label>
                      <input
                        id={name}
                        name={name}
                        type="text"
                        inputMode="decimal"
                        className="input-field"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* One value, not one per eye: prescriptions.pupillary_distance is a
          single column. The mockup showed a per-eye monocular PD, which this
          schema cannot store — recording only one of the two would be worse
          than recording the binocular figure the column actually means. */}
      <div className="card p-6">
        <label htmlFor="pupillaryDistance" className="mb-1 block text-sm font-medium text-dark">
          Pupillary distance (mm)
        </label>
        <p className="mb-2 text-xs text-muted">{rangeHint(OPTICAL_RANGES.pupillaryDistance)}</p>
        <input
          id="pupillaryDistance"
          name="pupillaryDistance"
          type="text"
          inputMode="decimal"
          className="input-field"
        />
      </div>

      {/* TODO (C3): the mockup asked the optometrist to tick "I certify this
          prescription (licence KA-OPT-2024-1187)". Not built —
          optometrist_partners stores no licence or council registration
          number, so the checkbox would be a legal attestation against a
          number we do not hold, and the licence in the label would be
          invented. Add it once the partner record carries a real
          registration number, captured and verified during KYC.

          A notes field is omitted for a plainer reason: prescriptions has no
          column to put it in, so anything typed would be silently discarded. */}

      <button type="submit" disabled={isPending} className="btn-primary w-full py-3 text-lg">
        {isPending ? 'Saving…' : 'Save Prescription'}
      </button>
    </form>
  )
}
