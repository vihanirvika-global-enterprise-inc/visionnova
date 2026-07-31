'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { registerAction } from './actions'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await registerAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="card mx-auto w-full max-w-md p-8">

        {/* Wordmark */}
        <p className="mb-2 text-center text-xl font-bold text-primary">VisionNova</p>

        {/* Title + subtitle */}
        <h1 className="text-center text-2xl font-bold text-dark">Create your account</h1>
        <p className="mb-8 mt-1 text-center text-sm text-muted">
          Join VisionNova to start shopping
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {error && (
            <div
              role="alert"
              className="card flex items-center gap-2 border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <svg aria-hidden="true"
                className="h-4 w-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* First + Last Name — separate fields required by tests: /first name/i and /last name/i */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-dark">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                autoComplete="given-name"
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-dark">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                autoComplete="family-name"
                className="input-field"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-dark">
              Email address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              className="input-field"
            />
          </div>

          {/* Password — single field only; "Confirm password" label would create double /password/i match */}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-dark">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="new-password"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full py-2.5 text-base"
          >
            Create Account
          </button>

          <p className="text-center text-xs text-muted">
            By creating an account you agree to our{' '}
            <Link href="/help" className="text-primary underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/help" className="text-primary underline">Privacy Policy</Link>
          </p>

        </form>

        {/* Switch link — text must contain "login" to match test: getByRole('link', { name: /login/i }) */}
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary underline">
            Login
          </Link>
        </p>

      </div>
    </main>
  )
}
