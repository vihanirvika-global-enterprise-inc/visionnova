'use client'

import { useState } from 'react'
import { searchFaq, faqSectionAnchorId, type FaqSection } from '@/lib/faq'

interface FaqSearchProps {
  sections: FaqSection[]
}

// ST-020 (B5. Help Center & Support — "FAQ search returns relevant
// results"). Client-side filter over a static, small FAQ list (~14 items) —
// no backend search API is warranted at this content volume.
export function FaqSearch({ sections }: FaqSearchProps) {
  const [query, setQuery] = useState('')
  const results = searchFaq(sections, query)

  return (
    <div>
      <div className="mb-8">
        <label htmlFor="faq-search" className="sr-only">
          Search help topics
        </label>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help topics..."
          className="input-field w-full"
        />
      </div>

      {results.length === 0 ? (
        <p className="py-8 text-center text-muted">
          No results for &quot;{query}&quot;
        </p>
      ) : (
        <div className="space-y-8">
          {results.map((section) => (
            <section key={section.title}>
              {/* The id is the jump target for the topic tiles above, derived
                  in faq.ts so tile and heading cannot disagree. On the heading
                  rather than the wrapper so the section title is what comes
                  into view, and what a screen reader announces on arrival. */}
              <h2
                id={faqSectionAnchorId(section.title)}
                className="mb-2 scroll-mt-24 text-base font-semibold text-dark"
              >
                {section.title}
              </h2>
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {section.items.map((item) => (
                  <details key={item.question} className="border-b border-slate-100 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-dark">
                      {item.question}
                      <span className="text-xl text-primary">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
