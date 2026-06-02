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
    <main>
      <form onSubmit={handleSubmit}>
        {error && <p role="alert">{error}</p>}

        <label htmlFor="firstName">First Name</label>
        <input id="firstName" type="text" name="firstName" />

        <label htmlFor="lastName">Last Name</label>
        <input id="lastName" type="text" name="lastName" />

        <label htmlFor="email">Email</label>
        <input id="email" type="email" name="email" />

        <label htmlFor="password">Password</label>
        <input id="password" type="password" name="password" />

        <button type="submit" disabled={isPending}>Create Account</button>
      </form>
      <Link href="/login">Login</Link>
    </main>
  )
}
