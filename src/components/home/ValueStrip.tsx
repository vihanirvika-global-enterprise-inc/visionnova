import Link from 'next/link'

// Every claim here is traceable to src/lib/faq.ts or to a shipped feature.
// The mockup also carried "Free shipping over ₹699" and "1-year warranty";
// neither appears in the FAQ, the catalogue, or any policy in this repo, so
// they are omitted rather than invented. Add them here once a real policy
// exists — and add the matching FAQ entry in the same change.
const VALUES = [
  {
    // faq.ts → Shipping & Delivery
    label: 'Delivery in 5–7 business days across India',
    icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h.375c.621 0 1.125-.504 1.125-1.125V11.25M16.5 6h2.25l2.25 5.25M2.25 6h13.5v11.25H2.25z',
  },
  {
    // faq.ts → Returns & Refunds. Stated in full: the mockup's flat "14-day"
    // understates the frame policy, the old homepage's "30-Day" overstated
    // the prescription one.
    label: '30-day returns, 14 days on prescription',
    icon: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  },
  {
    // The prescription review queue is built (admin/prescriptions).
    label: 'Prescriptions verified by licensed optometrists',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z',
  },
  {
    // /eye-test is built. No price claim: nothing in the repo establishes
    // that the consultation is free.
    label: 'Book an eye test with a partner optometrist',
    href: '/eye-test',
    icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z',
  },
] as const

export function ValueStrip() {
  return (
    <section className="border-y border-slate-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="sr-only" id="why-visionnova">Why VisionNova</h2>
        <ul
          aria-labelledby="why-visionnova"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {VALUES.map((value) => (
            <li key={value.label} className="flex flex-col items-center gap-2 text-center">
              <svg aria-hidden="true" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={value.icon} />
              </svg>
              {'href' in value ? (
                <Link href={value.href} className="text-sm text-dark underline-offset-4 hover:text-primary hover:underline">
                  {value.label}
                </Link>
              ) : (
                <span className="text-sm text-dark">{value.label}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
