'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { AuthField } from '@/components/auth/AuthField'
import { MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy'
import type { AuthFormState } from '@/lib/authFormState'
import { partnerOnboardingAction } from './actions'

const FIELD_ORDER = ['firstName', 'lastName', 'email', 'password', 'clinicName'] as const

// ST-021 (C1. Optometrist Onboarding). Separate from the customer
// /register form — a distinct account type (role='partner_optometrist'),
// with its own clinic name and KYC document fields.
export default function PartnerOnboardingPage() {
  const [state, setState] = useState<AuthFormState>({})
  const [isPending, startTransition] = useTransition()
  const [fileName, setFileName] = useState<string | null>(null)
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
      const result = await partnerOnboardingAction(formData)
      if (!result) return
      setState(result)

      const firstInvalid = FIELD_ORDER.find((field) => result.fieldErrors?.[field]?.length)
      if (firstInvalid) inputs.current[firstInvalid]?.focus()
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="card mx-auto w-full max-w-md p-8">

        <p className="mb-2 text-center text-xl font-bold text-primary">VisionNova</p>
        <h1 className="text-center text-2xl font-bold text-dark">Partner Clinic Onboarding</h1>
        <p className="mb-8 mt-1 text-center text-sm text-muted">
          Register your clinic to join the VisionNova partner network
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

          <div className="grid grid-cols-2 gap-4">
            <AuthField
              id="firstName" name="firstName" type="text" label="Your first name"
              autoComplete="given-name" required
              errors={fieldErrors.firstName}
              ref={(el) => { inputs.current.firstName = el }}
            />
            <AuthField
              id="lastName" name="lastName" type="text" label="Your last name"
              autoComplete="family-name" required
              errors={fieldErrors.lastName}
              ref={(el) => { inputs.current.lastName = el }}
            />
          </div>

          <AuthField
            id="email" name="email" type="email" label="Email address"
            autoComplete="email" required
            errors={fieldErrors.email}
            ref={(el) => { inputs.current.email = el }}
          />

          <AuthField
            id="password" name="password" type="password" label="Password"
            autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
            errors={fieldErrors.password}
            ref={(el) => { inputs.current.password = el }}
          />

          <AuthField
            id="clinicName" name="clinicName" type="text" label="Clinic name"
            required
            errors={fieldErrors.clinicName}
            ref={(el) => { inputs.current.clinicName = el }}
          />

          <div>
            <label htmlFor="kycDocument" className="mb-1 block text-sm font-medium text-dark">
              KYC document (business registration or license)
            </label>
            <input
              id="kycDocument"
              name="kycDocument"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              className="text-sm"
            />
            {fileName && <p className="mt-1 text-xs text-muted">Selected: {fileName}</p>}
            <p className="mt-1 text-xs text-muted">Encrypted at rest and reviewed by our compliance team.</p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full py-2.5 text-base"
          >
            {isPending ? 'Submitting...' : 'Submit for Review'}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already a partner?{' '}
          <Link href="/login" className="font-medium text-primary underline">
            Sign in
          </Link>
        </p>

      </div>
    </main>
  )
}
