import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { CookieConsentProvider } from './CookieConsentProvider'
import { CookieConsentBanner } from './CookieConsentBanner'

function renderBanner() {
  return render(
    <CookieConsentProvider>
      <CookieConsentBanner />
    </CookieConsentProvider>
  )
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.style.removeProperty('--cookie-banner-height')
})

// The banner is position:fixed, so it is out of normal flow and reserves no
// layout space. Anything underneath it — checkout form fields, the homepage
// price tiers — sits behind an opaque bar until a decision is made. Publishing
// its height lets the page pad itself by exactly that much.
describe('CookieConsentBanner layout reservation', () => {
  it('publishes its height so the page can reserve space for it', async () => {
    renderBanner()
    await screen.findByRole('dialog')

    const reserved = document.documentElement.style.getPropertyValue('--cookie-banner-height')
    expect(reserved).toMatch(/^\d+(\.\d+)?px$/)
  })

  it('releases the reserved space once a decision is made', async () => {
    const user = userEvent.setup()
    renderBanner()
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const reserved = document.documentElement.style.getPropertyValue('--cookie-banner-height')
    expect(reserved === '' || reserved === '0px').toBe(true)
  })

  it('releases the reserved space when unmounted', async () => {
    const { unmount } = renderBanner()
    await screen.findByRole('dialog')

    act(() => { unmount() })

    const reserved = document.documentElement.style.getPropertyValue('--cookie-banner-height')
    expect(reserved === '' || reserved === '0px').toBe(true)
  })
})

// jsdom applies no stylesheet, so position can only be asserted through the
// class contract. It is worth asserting anyway: MobileBottomNav is also
// fixed to bottom-0 at z-40, so a banner at bottom-0/z-50 covers the entire
// mobile navigation until the visitor answers.
describe('CookieConsentBanner stacking', () => {
  it('sits above the mobile bottom nav rather than on top of it', async () => {
    renderBanner()
    const dialog = await screen.findByRole('dialog')

    expect(dialog.className).toContain('bottom-16')
    expect(dialog.className).toContain('md:bottom-0')
  })
})
