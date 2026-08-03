'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  errors?: string[]
  hint?: string
}

// One place for the error/hint wiring, so login and register cannot drift
// apart on how an invalid field is announced.
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  function AuthField({ id, label, errors, hint, ...inputProps }, ref) {
    const hasError = !!errors?.length
    const errorId = `${id}-error`
    const hintId = `${id}-hint`

    // Points at whichever of hint/error actually exist — an aria-describedby
    // referencing a missing id is announced as nothing at all by some screen
    // readers, which would silently drop the message.
    const describedBy = [hint ? hintId : null, hasError ? errorId : null]
      .filter(Boolean)
      .join(' ')

    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-dark">
          {label}
        </label>
        <input
          {...inputProps}
          id={id}
          ref={ref}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy || undefined}
          className="input-field"
        />
        {hint && (
          <p id={hintId} className="mt-1 text-xs text-muted">
            {hint}
          </p>
        )}
        {hasError && (
          <ul id={errorId} className="mt-1 space-y-0.5 text-xs text-red-700">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }
)
