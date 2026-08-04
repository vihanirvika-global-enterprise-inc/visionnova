import type { Metadata } from 'next'
import { FAQ_SECTIONS } from '@/lib/faq'
import { FaqSearch } from '@/components/help/FaqSearch'

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

      {/* Contact banner */}
      <div className="card p-6 bg-surface mb-10 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="font-semibold text-dark">Still have questions?</p>
          <p className="text-muted text-sm">Email us at support@visionnova.com</p>
        </div>
        <a href="mailto:support@visionnova.com" className="btn-primary">
          Email Support
        </a>
      </div>

      {/* ST-020 (B5. Help Center & Support — "FAQ search returns relevant
          results"). FAQ_SECTIONS is the exact same copy the page used to
          hardcode inline, now data FaqSearch can filter. */}
      <FaqSearch sections={FAQ_SECTIONS} />
    </main>
  )
}
