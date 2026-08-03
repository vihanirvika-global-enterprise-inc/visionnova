import { NewsletterSignupForm } from './NewsletterSignupForm'

export function Footer() {
  const name = process.env.GRIEVANCE_OFFICER_NAME
  const email = process.env.GRIEVANCE_OFFICER_EMAIL
  const phone = process.env.GRIEVANCE_OFFICER_PHONE

  // Email is the functional minimum: it's the reachable channel the mailto
  // link uses. A name with no way to reach them isn't a real contact point,
  // and phone stays genuinely optional.
  const isConfigured = Boolean(name && email)

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
        {isConfigured ? (
          <>
            <p>{name}</p>
            <a href={`mailto:${email}`}>{email}</a>
            {phone && <a href={`tel:${phone}`}>{phone}</a>}
          </>
        ) : (
          // A quiet grey fallback line was easy to miss in review or QA —
          // exactly how the statutory contact point ended up unconfigured in
          // a real environment. This has to be impossible to miss.
          <p role="alert">
            Grievance Officer contact not configured. This is a DPDP
            requirement — set GRIEVANCE_OFFICER_NAME and
            GRIEVANCE_OFFICER_EMAIL before deploying.
          </p>
        )}
      </section>

      <NewsletterSignupForm />
    </footer>
  )
}
