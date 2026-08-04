import { test, expect, type Page } from '@playwright/test'

// FINDING-2 regression guard.
//
// These forms submit through onSubmit + preventDefault, which does not exist
// until React hydrates. Submitting inside that window makes the browser perform
// the form's own native submit — and a GET form serialises every field into the
// query string, so the password lands in browser history, in the Referer header
// of the next navigation, and in every proxy and server access log.
//
// The unit tests assert method=post on the element. This asserts the property
// that actually matters, against a real browser, by submitting before the page
// has hydrated.

const CREDENTIAL_PAGES = [
  { route: '/login', password: 'ShouldNeverAppearInUrl1!' },
  { route: '/register', password: 'ShouldNeverAppearInUrl2!' },
]

// Route-level blocking of the JS chunks, so hydration provably cannot have run
// when we submit. Waiting on a timer would be a race; this is deterministic.
async function blockHydration(page: Page) {
  await page.route('**/*.js', (route) => route.abort())
}

for (const { route, password } of CREDENTIAL_PAGES) {
  test(`${route}: native pre-hydration submit never puts the password in the URL`, async ({
    page,
  }) => {
    const seenUrls: string[] = []
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) seenUrls.push(frame.url())
    })

    await blockHydration(page)
    await page.goto(route, { waitUntil: 'domcontentloaded' })

    // Server-rendered markup only — React has not hydrated, so onSubmit is not
    // attached and the browser will use the form's own method.
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByLabel('Password', { exact: true }).press('Enter')
    await page.waitForTimeout(1500)

    seenUrls.push(page.url())

    for (const url of seenUrls) {
      expect(url, `password leaked into URL: ${url}`).not.toContain(password)
      expect(url.toLowerCase()).not.toContain('password=')
    }
  })
}
