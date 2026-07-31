'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Replaces the whole document when the root layout itself fails, so it has to
// render its own <html> and <body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
          <h1 className="mb-3 text-2xl font-bold text-dark">Something went wrong</h1>
          <p className="mb-6 text-muted">
            The page failed to load. The problem has been reported to our team.
          </p>
          <button type="button" onClick={reset} className="btn-primary px-6 py-3">
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
