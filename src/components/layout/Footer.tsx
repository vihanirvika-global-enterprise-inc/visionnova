import { NewsletterSignupForm } from './NewsletterSignupForm'

export function Footer() {
  const name = process.env.GRIEVANCE_OFFICER_NAME ?? 'Grievance Officer name not configured'
  const email = process.env.GRIEVANCE_OFFICER_EMAIL
  const phone = process.env.GRIEVANCE_OFFICER_PHONE

  return (
    <footer>
      <nav aria-label="legal">
        <a href="/legal/terms">Terms</a>
        <a href="/legal/privacy">Privacy</a>
        <a href="/legal/returns">Returns</a>
        <a href="/legal/shipping">Shipping</a>
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
