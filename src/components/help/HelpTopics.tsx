import { faqSectionAnchorId, type FaqSection } from '@/lib/faq'

// The mockup's topic tiles, built from the sections that actually exist.
//
// It labelled each tile with an article count ("12 articles"). There is no
// article store — no CMS, no help-article table, nothing to count. The only
// real number here is how many questions the section holds, so that is what it
// says, and it says "questions" rather than "articles" because that is what
// they are. A test asserts the word "article" never appears.
export function HelpTopics({ sections }: { sections: FaqSection[] }) {
  if (sections.length === 0) return null

  return (
    <nav aria-label="Help topics" className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((section) => {
        const count = section.items.length
        return (
          <a
            key={section.title}
            href={`#${faqSectionAnchorId(section.title)}`}
            className="card p-4 transition-colors hover:border-primary/40 hover:bg-surface"
          >
            <span className="block font-semibold text-dark">{section.title}</span>
            <span className="mt-1 block text-sm text-muted">
              {count} {count === 1 ? 'question' : 'questions'}
            </span>
          </a>
        )
      })}
    </nav>
  )
}
