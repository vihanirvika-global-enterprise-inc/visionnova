import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <h1>Welcome to VisionNova</h1>
      <p>Premium eyewear, delivered to your door.</p>
      <Link href="/shop">Shop Now</Link>
    </main>
  )
}
