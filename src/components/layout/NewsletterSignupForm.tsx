'use client'

import { useState } from 'react'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function NewsletterSignupForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!isValidEmail(email)) {
      setError('Enter a valid email address')
      return
    }

    setError(null)
  }

  return (
    <form aria-label="Newsletter signup" onSubmit={handleSubmit} noValidate>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="newsletter-email">Email address</label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button type="submit">Subscribe</button>
    </form>
  )
}
