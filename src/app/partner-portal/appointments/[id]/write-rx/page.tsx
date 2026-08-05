'use client'

import { useRef, useState, useTransition } from 'react'
import type { WriteRxFormState } from './actions'
import { writePrescriptionAction } from './actions'

interface WriteRxPageProps {
  params: { id: string }
}

const EYE_FIELDS = [
  { key: 'Sphere', name: 'Sphere' },
  { key: 'Cylinder', name: 'Cylinder' },
  { key: 'Axis', name: 'Axis' },
  { key: 'Add', name: 'Add' },
] as const

// ST-023 (C3. Digital Rx Writing Tool). Every field is optional at the form
// level — a prescription doesn't need every one filled in (e.g. no
// astigmatism means no cylinder) — validation happens server-side in
// writePrescriptionAction, which is what actually enforces the clinical
// ranges (this page trusts noValidate + real bounds checking there, same
// pattern as every other auth/checkout form in this app).
export default function WriteRxPage({ params }: WriteRxPageProps) {
  const [state, setState] = useState<WriteRxFormState>({})
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

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
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-dark">Write Prescription</h1>
      <p className="mt-2 text-muted">
        Enter clinical values for this appointment. Fields left blank are not recorded.
      </p>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6">
        <input type="hidden" name="appointmentId" value={params.id} />

        {state.formError && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {state.formError}
          </p>
        )}

        {(['right', 'left'] as const).map((eye) => (
          <div key={eye} className="card p-6">
            <p className="mb-4 font-semibold text-dark">{eye === 'right' ? 'Right Eye (OD)' : 'Left Eye (OS)'}</p>
            <div className="grid grid-cols-2 gap-4">
              {EYE_FIELDS.map((field) => {
                const name = `${eye}${field.key}`
                return (
                  <div key={name}>
                    <label htmlFor={name} className="mb-1 block text-sm font-medium text-dark">
                      {field.name}
                    </label>
                    <input id={name} name={name} type="text" inputMode="decimal" className="input-field" />
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="card p-6">
          <label htmlFor="pupillaryDistance" className="mb-1 block text-sm font-medium text-dark">
            Pupillary Distance (mm)
          </label>
          <input id="pupillaryDistance" name="pupillaryDistance" type="text" inputMode="decimal" className="input-field" />
        </div>

        <button type="submit" disabled={isPending} className="btn-primary w-full py-3 text-lg">
          {isPending ? 'Saving...' : 'Save Prescription'}
        </button>
      </form>
    </main>
  )
}
