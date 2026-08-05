import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import userEvent from '@testing-library/user-event'
import { CONSENT_STORAGE_KEY, CONSENT_MAX_AGE_MS, writeConsent } from '@/lib/cookieConsent'

const { mockInit, mockReset, mockOptOut } = vi.hoisted(() => ({
  mockInit: vi.fn(),
  mockReset: vi.fn(),
  mockOptOut: vi.fn(),
}))

vi.mock('posthog-js', () => ({
  default: { init: mockInit, reset: mockReset, opt_out_capturing: mockOptOut, capture: vi.fn() },
}))

// next/script renders nothing useful in jsdom; a marker element lets the test
// assert on whether GA4's tags would have been emitted at all.
vi.mock('next/script', () => ({
  default: ({ src, id }: { src?: string; id?: string }) => (
    <div data-testid="ga4-script" data-src={src ?? id} />
  ),
}))

import { CookieConsentProvider, useCookieConsent } from './CookieConsentProvider'
import { CookieConsentBanner } from './CookieConsentBanner'
import { PostHogProvider } from '@/components/analytics/PostHogProvider'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'

function renderApp() {
  return render(
    <CookieConsentProvider>
      <PostHogProvider>
        <p>page content</p>
      </PostHogProvider>
      <CookieConsentBanner />
      <GoogleAnalytics />
    </CookieConsentProvider>
  )
}

const banner = () => screen.queryByRole('dialog', { name: /analytics cookies/i })
const ga4Tags = () => screen.queryAllByTestId('ga4-script')

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
  vi.stubEnv('NEXT_PUBLIC_GA4_ID', 'G-TEST')
})

describe('first visit — nothing decided', () => {
  it('shows the banner', async () => {
    renderApp()

    await waitFor(() => expect(banner()).toBeInTheDocument())
  })

  it('initialises neither tracker before a decision', async () => {
    renderApp()

    await waitFor(() => expect(banner()).toBeInTheDocument())

    expect(mockInit).not.toHaveBeenCalled()
    expect(ga4Tags()).toHaveLength(0)
  })

  // Equal prominence is the compliance requirement, not a style preference.
  it('offers accept and reject with the same styling', async () => {
    renderApp()
    await waitFor(() => expect(banner()).toBeInTheDocument())

    const accept = screen.getByRole('button', { name: 'Accept' })
    const reject = screen.getByRole('button', { name: 'Reject' })

    expect(accept.className).toBe(reject.className)
  })

  it('links to the privacy policy', async () => {
    renderApp()
    await waitFor(() => expect(banner()).toBeInTheDocument())

    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
  })
})

describe('accept', () => {
  it('persists the decision, dismisses the banner and starts both trackers', async () => {
    renderApp()
    await waitFor(() => expect(banner()).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() => expect(mockInit).toHaveBeenCalledWith('phc_test', expect.anything()))
    expect(ga4Tags().length).toBeGreaterThan(0)
    expect(banner()).not.toBeInTheDocument()
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toContain('accepted')
  })

  it('does not ask again on the next visit, and still starts the trackers', async () => {
    writeConsent('accepted')

    renderApp()

    await waitFor(() => expect(mockInit).toHaveBeenCalled())
    expect(ga4Tags().length).toBeGreaterThan(0)
    expect(banner()).not.toBeInTheDocument()
  })
})

describe('reject', () => {
  it('persists the decision, dismisses the banner and starts nothing', async () => {
    renderApp()
    await waitFor(() => expect(banner()).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() => expect(banner()).not.toBeInTheDocument())
    expect(mockInit).not.toHaveBeenCalled()
    expect(ga4Tags()).toHaveLength(0)
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toContain('rejected')
  })

  // "No" must not be re-asked on every page load — that is the dark pattern
  // where refusal is treated as an unanswered question.
  it('does not ask again on the next visit, and still starts nothing', async () => {
    writeConsent('rejected')

    renderApp()

    await waitFor(() => expect(screen.getByText('page content')).toBeInTheDocument())
    expect(banner()).not.toBeInTheDocument()
    expect(mockInit).not.toHaveBeenCalled()
    expect(ga4Tags()).toHaveLength(0)
  })
})

describe('expiry', () => {
  it('asks again once the decision is over twelve months old', async () => {
    writeConsent('accepted', Date.now() - CONSENT_MAX_AGE_MS - 1)

    renderApp()

    await waitFor(() => expect(banner()).toBeInTheDocument())
    expect(mockInit).not.toHaveBeenCalled()
    expect(ga4Tags()).toHaveLength(0)
  })
})

describe('withdrawal mid-session', () => {
  it('resets PostHog and opts out when consent is revoked', async () => {
    writeConsent('accepted')

    function Revoker() {
      const { revoke } = useCookieConsent()
      return <button onClick={revoke}>revoke</button>
    }

    render(
      <CookieConsentProvider>
        <PostHogProvider>
          <Revoker />
        </PostHogProvider>
        <GoogleAnalytics />
      </CookieConsentProvider>
    )

    await waitFor(() => expect(mockInit).toHaveBeenCalled())
    expect(ga4Tags().length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: 'revoke' }))

    await waitFor(() => expect(mockReset).toHaveBeenCalled())
    expect(mockOptOut).toHaveBeenCalled()
    expect(ga4Tags()).toHaveLength(0)
  })
})

describe('server-side rendering', () => {
  // Asserted against real server rendering rather than in jsdom: Testing
  // Library flushes effects inside act(), so a synchronous assertion there
  // would already see the post-hydration state and could never catch a flash.
  // What matters is that the server emits no banner, so hydration has nothing
  // to remove.
  it('emits no banner and no analytics tags in the server markup', () => {
    window.localStorage.clear()

    const html = renderToStaticMarkup(
      <CookieConsentProvider>
        <PostHogProvider>
          <p>page content</p>
        </PostHogProvider>
        <CookieConsentBanner />
        <GoogleAnalytics />
      </CookieConsentProvider>
    )

    expect(html).toContain('page content')
    expect(html).not.toMatch(/analytics cookies/i)
    expect(html).not.toContain('ga4-script')
    expect(mockInit).not.toHaveBeenCalled()
  })

  // Even with consent already stored, the server cannot know it — localStorage
  // is client-only — so the server markup must still be bannerless and the
  // client must agree on that first render.
  it('emits no banner even when consent is already stored', () => {
    writeConsent('accepted')

    const html = renderToStaticMarkup(
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    )

    expect(html).not.toMatch(/analytics cookies/i)
  })
})
