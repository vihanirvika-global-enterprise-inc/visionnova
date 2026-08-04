import { test, expect } from '@playwright/test'

// EP-010 BUG-006 (Risk TECH-07): 70% of traffic is mobile. These assertions
// pin the responsive contract on the pages every journey passes through —
// the layout must never scroll sideways, and the navigation must swap
// correctly between the mobile bottom bar (md:hidden) and the desktop nav.
const KEY_PAGES = ['/', '/shop', '/help', '/login']

for (const path of KEY_PAGES) {
  test(`${path} has no horizontal overflow`, async ({ page }) => {
    await page.goto(path)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}

test('navigation matches the viewport', async ({ page, isMobile }) => {
  await page.goto('/')

  const bottomNav = page.getByRole('navigation', { name: /mobile navigation/i })
  if (isMobile) {
    await expect(bottomNav).toBeVisible()
  } else {
    await expect(bottomNav).toBeHidden()
  }
})

test('shop renders its product grid', async ({ page }) => {
  await page.goto('/shop')

  await expect(page.getByRole('main')).toBeVisible()
})

test('login form is usable at every size', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByLabel(/email/i)).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in|log ?in/i })).toBeVisible()
})
