import type { Metadata } from 'next'
import { FAQ_SECTIONS } from '@/lib/faq'
import { FaqSearch } from '@/components/help/FaqSearch'
import { HelpTopics } from '@/components/help/HelpTopics'

export const metadata: Metadata = {
  title: 'Help & FAQ',
  description: 'Answers to common questions about ordering, prescriptions, shipping, returns, and your VisionNova account.',
}

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-dark">Help &amp; FAQ</h1>
      <p className="text-muted mt-2 mb-10">
        Everything you need to know about ordering prescription eyewear from VisionNova.
      </p>

      <HelpTopics sections={FAQ_SECTIONS} />

      {/* Contact banner.

          TODO (B5): the mockup's contact rail also carried a phone number
          (+91 80 4000 1200), a WhatsApp link, staffed hours (Mon–Sat,
          10:00–18:00 IST) and a "12-hour response SLA". None of them ships.
          There is no phone number in this repo's config, no WhatsApp
          integration, and the only "12 hours" in faq.ts is prescription
          verification — not a support response time. A number nobody answers
          is worse than no number, and an SLA we have not committed to is a
          promise. Add them when there is a support desk to point at.

          The message form links to /about rather than being rebuilt here:
          that is the only contact form with a server action, rate limiting
          and persistence behind it. */}
      <div className="card p-6 bg-surface mb-10 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="font-semibold text-dark">Still have questions?</p>
          <p className="text-muted text-sm">Email us at support@visionnova.com</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="mailto:support@visionnova.com" className="btn-primary">
            Email Support
          </a>
          <a href="/about#contact" className="btn-secondary">
            Send us a message
          </a>
        </div>
      </div>

      {/* ST-020 (B5. Help Center & Support — "FAQ search returns relevant
          results"). FAQ_SECTIONS is the exact same copy the page used to
          hardcode inline, now data FaqSearch can filter. */}
      <FaqSearch sections={FAQ_SECTIONS} />
    </main>
  )
}
