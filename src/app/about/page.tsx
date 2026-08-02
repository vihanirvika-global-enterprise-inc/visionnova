import type { Metadata } from 'next'
import ContactForm from './ContactForm'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about VisionNova — our mission to make quality prescription eyewear accessible across India.',
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">

      {/* Section 1 — Hero */}
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-dark">Seeing the World Clearly, Together</h1>
          <p className="mb-4 mt-4 text-muted">
            VisionNova was founded on a simple belief: quality prescription eyewear
            shouldn&apos;t cost a fortune or require a trip to an overpriced chain store.
          </p>
          <p className="text-muted">
            We connect customers directly with licensed optometrists and trusted frame
            manufacturers — cutting out the middlemen so you get premium eyewear at
            honest prices, delivered to your door.
          </p>
        </div>
        <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary to-teal" />
      </div>

      {/* Section 2 — Values */}
      <div className="-mx-4 mt-16 bg-surface px-4 py-16 sm:-mx-6 sm:px-6">
        <h2 className="mb-10 text-center">What We Stand For</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

          <div className="card p-6 text-center">
            <svg aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <h3 className="mb-2 font-semibold text-dark">Trustworthy</h3>
            <p className="text-sm leading-relaxed text-muted">
              Licensed optometrists verify every prescription. Your vision health is never compromised.
            </p>
          </div>

          <div className="card p-6 text-center">
            <svg aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <h3 className="mb-2 font-semibold text-dark">Inclusive</h3>
            <p className="text-sm leading-relaxed text-muted">
              Premium eyewear shouldn&apos;t be a luxury. We believe everyone deserves to see clearly.
            </p>
          </div>

          <div className="card p-6 text-center">
            <svg aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mb-2 font-semibold text-dark">Transparent</h3>
            <p className="text-sm leading-relaxed text-muted">
              Honest pricing, no hidden fees. What you see is what you pay.
            </p>
          </div>

          <div className="card p-6 text-center">
            <svg aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <h3 className="mb-2 font-semibold text-dark">Caring</h3>
            <p className="text-sm leading-relaxed text-muted">
              Real human support, not bots. Real people who care about your experience.
            </p>
          </div>

        </div>
      </div>

      {/* Section 3 — Contact form */}
      <div className="card mx-auto mt-16 max-w-2xl p-8">
        <h2 className="mb-2 text-center">Get In Touch</h2>
        <p className="mb-8 text-center text-muted">
          We respond to all enquiries within 24 hours.
        </p>
        <ContactForm />
      </div>

    </main>
  )
}
