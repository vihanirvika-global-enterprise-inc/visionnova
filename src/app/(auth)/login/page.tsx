'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { loginAction } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await loginAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="card mx-auto w-full max-w-md p-8">

        {/* Wordmark */}
        <p className="mb-2 text-center text-xl font-bold text-primary">VisionNova</p>

        {/* Title + subtitle */}
        <h1 className="text-center text-2xl font-bold text-dark">Welcome back</h1>
        <p className="mb-8 mt-1 text-center text-sm text-muted">
          Sign in to view your orders and prescriptions
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {error && (
            <div
              role="alert"
              className="card flex items-center gap-2 border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <svg
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

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-dark">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              className="input-field"
            />
            <a
              href="#"
              className="mt-1 block text-right text-xs text-primary"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary mb-0 w-full py-2.5 text-base"
          >
            Sign In
          </button>

        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <hr className="flex-1 border-slate-200" />
          <span className="text-xs text-muted">or</span>
          <hr className="flex-1 border-slate-200" />
        </div>

        {/* Switch link — text must contain "register" to match test: getByRole('link', { name: /register/i }) */}
        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-primary">
            Register
          </Link>
        </p>

      </div>
    </main>
  )
}
