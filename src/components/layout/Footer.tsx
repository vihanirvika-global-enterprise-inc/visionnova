import { NewsletterSignupForm } from './NewsletterSignupForm'

export function Footer() {
  const name = process.env.GRIEVANCE_OFFICER_NAME ?? 'Grievance Officer name not configured'
  const email = process.env.GRIEVANCE_OFFICER_EMAIL
  const phone = process.env.GRIEVANCE_OFFICER_PHONE

  return (
    <footer>
      {/* These pointed at /legal/terms, /legal/privacy, /legal/returns and
          /legal/shipping. No /legal route exists, so all four 404'd on every
          page. Returns and Shipping now point at /help, which genuinely holds
          that policy. Terms and Privacy are not linked at all: no such
          document exists yet, and a link to nothing is worse than no link —
          the Grievance Officer contact below is the real route for
          data-protection questions in the meantime. */}
      <nav aria-label="legal">
        <a href="/help">Returns</a>
        <a href="/help">Shipping</a>
      </nav>

      <section aria-labelledby="grievance-officer-heading">
        <h2 id="grievance-officer-heading">Grievance Officer</h2>
        <p>{name}</p>
        {email && <a href={`mailto:${email}`}>{email}</a>}
        {phone && <a href={`tel:${phone}`}>{phone}</a>}
      </section>

      <NewsletterSignupForm />
    </footer>
  )
}
