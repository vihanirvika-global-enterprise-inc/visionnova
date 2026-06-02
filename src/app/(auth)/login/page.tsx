export default function LoginPage() {
  return (
    <main>
      <form>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" name="email" />

        <label htmlFor="password">Password</label>
        <input id="password" type="password" name="password" />

        <button type="submit">Sign In</button>
      </form>
    </main>
  )
}
