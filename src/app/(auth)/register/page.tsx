import Link from 'next/link'

export default function RegisterPage() {
  return (
    <main>
      <form>
        <label htmlFor="firstName">First Name</label>
        <input id="firstName" type="text" name="firstName" />

        <label htmlFor="lastName">Last Name</label>
        <input id="lastName" type="text" name="lastName" />

        <label htmlFor="email">Email</label>
        <input id="email" type="email" name="email" />

        <label htmlFor="password">Password</label>
        <input id="password" type="password" name="password" />

        <button type="submit">Create Account</button>
      </form>
      <Link href="/login">Login</Link>
    </main>
  )
}
