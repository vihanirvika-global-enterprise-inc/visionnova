import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-dark mb-3">Access Denied</h1>
        <p className="text-muted mb-6">
          You don&apos;t have permission to view this page.
        </p>
        <Link href="/account" className="text-primary hover:underline text-sm">
          ← Back to your account
        </Link>
      </div>
    </main>
  )
}
