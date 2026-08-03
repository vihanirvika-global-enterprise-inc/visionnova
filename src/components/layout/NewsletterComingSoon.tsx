// Replaces a form that validated email format client-side and, on success,
// did nothing — no server action, no persistence, no confirmation state. No
// real newsletter tooling or double-opt-in strategy exists yet (single-opt-in
// isn't DPDP-safe for marketing email), so this states the real, current
// state rather than a subscribe flow that doesn't subscribe anyone.
export function NewsletterComingSoon() {
  return (
    <p>
      Newsletter coming soon — email{' '}
      <a href="mailto:newsletter@visionnova.com">newsletter@visionnova.com</a>
      {' '}to be notified when we launch.
    </p>
  )
}
