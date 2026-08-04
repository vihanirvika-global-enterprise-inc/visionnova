'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { AuthField } from '@/components/auth/AuthField'
import type { AuthFormState } from '@/lib/authFormState'
import { loginAction } from './actions'

// Focus order, so a failed submit lands on the first offending input rather
// than leaving the user to hunt for it.
const FIELD_ORDER = ['email', 'password'] as const

export default function LoginPage() {
  const [state, setState] = useState<AuthFormState>({})
  const [isPending, startTransition] = useTransition()
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const fieldErrors = state.fieldErrors ?? {}
  const allMessages = [
    ...(state.formError ? [state.formError] : []),
    ...Object.values(fieldErrors).flat(),
  ]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setState({})
    startTransition(async () => {
      const result = await loginAction(formData)
      if (!result) return
      setState(result)

      const firstInvalid = FIELD_ORDER.find((field) => result.fieldErrors?.[field]?.length)
      if (firstInvalid) inputs.current[firstInvalid]?.focus()
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

        {/* noValidate: the browser's own bubbles would pre-empt our inline
            messages, which are the ones wired up for screen readers. The
            required/type attributes still document intent and stay useful if
            JS fails to load. */}
        {/* method=post is load-bearing, not cosmetic: onSubmit does not exist
            until React hydrates, and a native submit before then would serialise
            the password into the query string — landing it in browser history,
            the next navigation's Referer header, and proxy/server access logs. */}
        <form method="post" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          {allMessages.length > 0 && (
            <div
              role="alert"
              className="card flex items-start gap-2 border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <svg aria-hidden="true"
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {allMessages.length === 1 ? (
                <span>{allMessages[0]}</span>
              ) : (
                <ul className="space-y-0.5">
                  {allMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <AuthField
            id="email"
            name="email"
            type="email"
            label="Email address"
            autoComplete="email"
            required
            errors={fieldErrors.email}
            ref={(el) => { inputs.current.email = el }}
          />

          <div>
            <AuthField
              id="password"
              name="password"
              type="password"
              label="Password"
              autoComplete="current-password"
              required
              errors={fieldErrors.password}
              ref={(el) => { inputs.current.password = el }}
            />
            <a
              href="mailto:support@visionnova.com?subject=Password%20reset%20request"
              className="mt-1 block text-right text-xs text-primary"
            >
              Forgot password? Email support
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
