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
    <main>
      <form onSubmit={handleSubmit}>
        {error && <p role="alert">{error}</p>}

        <label htmlFor="email">Email</label>
        <input id="email" type="email" name="email" />

        <label htmlFor="password">Password</label>
        <input id="password" type="password" name="password" />

        <button type="submit" disabled={isPending}>Sign In</button>
      </form>
      <Link href="/register">Register</Link>
    </main>
  )
}
