'use client'

import { useRef, useState, useTransition } from 'react'
import { AuthField } from '@/components/auth/AuthField'
import type { AuthFormState } from '@/lib/authFormState'
import { verifyOtpAction } from './actions'

// ST-013 (A13. Auth — OTP as a second factor on login). Reached only after
// loginAction confirms the password and sets the pending_login cookie — if
// that cookie is missing or expired, verifyOtpAction itself redirects back
// to /login rather than this page trying to detect that client-side.
export default function VerifyOtpPage() {
  const [state, setState] = useState<AuthFormState>({})
  const [isPending, startTransition] = useTransition()
  const codeInput = useRef<HTMLInputElement | null>(null)

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
      const result = await verifyOtpAction(formData)
      if (!result) return
      setState(result)
      codeInput.current?.focus()
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="card mx-auto w-full max-w-md p-8">

        <p className="mb-2 text-center text-xl font-bold text-primary">VisionNova</p>

        <h1 className="text-center text-2xl font-bold text-dark">Enter your code</h1>
        <p className="mb-8 mt-1 text-center text-sm text-muted">
          We emailed a 6-digit verification code. It expires in 5 minutes.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

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
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            label="Verification code"
            maxLength={6}
            required
            errors={fieldErrors.code}
            ref={codeInput}
          />

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary mb-0 w-full py-2.5 text-base"
          >
            Verify
          </button>

        </form>

      </div>
    </main>
  )
}
