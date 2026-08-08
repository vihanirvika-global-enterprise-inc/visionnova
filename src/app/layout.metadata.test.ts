import { describe, it, expect } from 'vitest'
import { metadata } from '@/app/layout'

// Same bug as the /shop description, with wider reach: this is the site-wide
// <meta description> and the OpenGraph card every shared link renders. Fixing
// only /shop would have left the root contradicting it.
describe('root metadata entry price', () => {
  it('quotes the same entry price as the homepage hero', () => {
    expect(metadata.description).toContain('₹999')
  })

  it('quotes it consistently in the OpenGraph card', () => {
    expect(metadata.openGraph?.description).toContain('₹999')
  })

  it('quotes no other entry price anywhere in the metadata', () => {
    const blob = JSON.stringify(metadata)
    expect(blob).not.toMatch(/₹799|₹899/)
  })
})
