import { NewsletterComingSoon } from './NewsletterComingSoon'

// Every href here is asserted against the real src/app route table in
// Footer.test.tsx. The footer renders on every page, so one dead link is a
// site-wide 404 — which is exactly how the old /legal/* links shipped.
const SHOP_LINKS = [
  { label: 'Eyeglasses', href: '/shop' },
  { label: 'Sunglasses', href: '/sunglasses' },
  { label: 'Contact lenses', href: '/contacts' },
]

const EYE_CARE_LINKS = [
  { label: 'Book an eye test', href: '/eye-test' },
  { label: 'Upload prescription', href: '/prescription-upload' },
  { label: 'Partner clinics', href: '/stores' },
  { label: 'For optometrists', href: '/partner-portal/register' },
]

// Both point at /about: CLAUDE.md scopes About and Contact as a single MVP
// screen, and that page carries the "Get In Touch" section.
const ABOUT_LINKS = [
  { label: 'About VisionNova', href: '/about' },
  { label: 'Contact us', href: '/about' },
]

const HELP_LINKS = [
  { label: 'Help centre', href: '/help' },
  { label: 'Returns', href: '/help' },
  { label: 'Shipping', href: '/help' },
]

export function Footer() {
  const name = process.env.GRIEVANCE_OFFICER_NAME
  const email = process.env.GRIEVANCE_OFFICER_EMAIL
  const phone = process.env.GRIEVANCE_OFFICER_PHONE
  const antiSpamEmail = process.env.ANTI_SPAM_CONTACT_EMAIL

  // Email is the functional minimum: it's the reachable channel the mailto
  // link uses. A name with no way to reach them isn't a real contact point,
  // and phone stays genuinely optional.
  const isConfigured = Boolean(name && email)

  return (
    <footer className="mt-16 bg-dark text-slate-300">
      {/* These pointed at /legal/terms, /legal/privacy, /legal/returns and
          /legal/shipping. No /legal route exists, so all four 404'd on every
          page. Returns and Shipping now point at /help, which genuinely holds
          that policy. Terms and Privacy are not linked at all: no such
          document exists yet, and a link to nothing is worse than no link —
          the Grievance Officer contact below is the real route for
          data-protection questions in the meantime. */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {[
          { heading: 'Shop', links: SHOP_LINKS },
          { heading: 'Eye care', links: EYE_CARE_LINKS },
          { heading: 'About', links: ABOUT_LINKS },
          { heading: 'Help', links: HELP_LINKS },
        ].map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              {column.heading}
            </h2>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-300 transition-colors hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* The roadmap also lists a Legal column — Terms, Privacy Policy, Cookie
          Policy. None of those documents or routes exists, and the cookie
          banner already links to a /privacy that 404s, so no column heading is
          rendered here: advertising documents we cannot produce is worse than
          omitting the section. Add the column once the routes land. */}

      {/* TODO (A1): registered-entity details go here — the legal entity name,
          registered office address, GSTIN, CIN, and the CDSCO manufacturing
          licence number. Left unrendered on purpose: the homepage compliance
          bar states "CDSCO licensed" and "BIS-certified", and those claims
          need real registration numbers behind them before launch.
          Placeholder-shaped strings (e.g. "GSTIN 29ABCDE1234F1Z5", or the
          mockup's "VisionNova International Pvt. Ltd.") must never ship — an
          invented licence number or entity name is a claim we cannot
          substantiate, not a styling placeholder. A footer test asserts none
          of them appear. Ask compliance for the real values, then render them
          in this block. */}

      {/* ST-014: the only site-wide link into the store locator — it isn't
          part of the main Navbar, so without this it would only be reachable
          by typing /stores directly. */}
      <div className="mx-auto max-w-7xl border-t border-slate-700 px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="stores" className="mb-6">
        <a href="/stores" className="text-sm text-slate-300 transition-colors hover:text-white">Store Locator</a>
      </nav>

      <section aria-labelledby="grievance-officer-heading">
        <h2 id="grievance-officer-heading" className="text-sm font-semibold uppercase tracking-wider text-white">
          Grievance Officer
        </h2>
        {isConfigured ? (
          <div className="mt-2 space-y-1 text-sm">
            <p>{name}</p>
            <a href={`mailto:${email}`} className="block text-slate-300 underline hover:text-white">{email}</a>
            {phone && <a href={`tel:${phone}`} className="block text-slate-300 underline hover:text-white">{phone}</a>}
          </div>
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

      {/* Rendered only when configured. Unlike the Grievance Officer above,
          this one stays silent rather than alerting: an unsubscribe mailbox
          that doesn't exist is worse than none, and inventing an address here
          would send opt-out requests into a black hole. */}
      {antiSpamEmail && (
        <section aria-labelledby="anti-spam-heading" className="mt-6">
          <h2 id="anti-spam-heading" className="text-sm font-semibold uppercase tracking-wider text-white">
            Anti-spam and unsubscribe
          </h2>
          <p className="mt-2 text-sm">
            To stop receiving marketing email from us, write to{' '}
            <a href={`mailto:${antiSpamEmail}`} className="underline hover:text-white">{antiSpamEmail}</a>.
          </p>
        </section>
      )}

        <div className="mt-6 text-sm">
          <NewsletterComingSoon />
        </div>
      </div>
    </footer>
  )
}
