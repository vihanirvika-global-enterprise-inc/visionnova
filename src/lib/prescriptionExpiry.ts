// B3. A date alone ("Expires 14/09/2026") makes the reader do the arithmetic,
// which is exactly the arithmetic people get wrong about a prescription that
// is about to lapse. Everything here is derived from the real expires_at
// column — nothing is estimated, and a row with no expiry says so rather than
// inventing a validity window.
const MS_PER_DAY = 86_400_000
const DAYS_PER_WEEK = 7
// Beyond this the relative form stops being useful ("expires in 34 weeks"),
// so the absolute date reads better.
const RELATIVE_HORIZON_DAYS = 8 * DAYS_PER_WEEK

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN')
}

export function describeExpiry(expiresAt: Date | null, now: Date = new Date()): string {
  if (!expiresAt) return 'No expiry on file'

  const days = Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY)

  if (days < 0) return `Expired on ${formatDate(expiresAt)}`
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  if (days < DAYS_PER_WEEK) return `Expires in ${days} days`

  if (days <= RELATIVE_HORIZON_DAYS) {
    const weeks = Math.floor(days / DAYS_PER_WEEK)
    return `Expires in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  }

  return `Expires ${formatDate(expiresAt)}`
}

// Drives the emphasis on the vault entry. A prescription lapsing inside six
// weeks is the one worth booking a test for; past that it is just information.
export function isExpiringSoon(expiresAt: Date | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false
  const days = Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY)
  return days >= 0 && days <= 6 * DAYS_PER_WEEK
}

export function hasExpired(expiresAt: Date | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false
  return expiresAt.getTime() < now.getTime()
}
