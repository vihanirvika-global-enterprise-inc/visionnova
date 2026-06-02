'use client'

import { useState, useTransition } from 'react'
import { uploadPrescriptionAction } from './actions'

export default function PrescriptionUploadPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await uploadPrescriptionAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        {error && <p role="alert">{error}</p>}

        <label htmlFor="prescription">Upload Prescription</label>
        <input
          id="prescription"
          type="file"
          name="prescription"
          accept=".pdf,.jpg,.jpeg,.png"
        />

        <button type="submit" disabled={isPending}>Upload Prescription</button>
      </form>
    </main>
  )
}
