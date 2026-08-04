import { defineConfig, devices } from '@playwright/test'

// EP-010 BUG-006 (Risk TECH-07 — 70% of traffic is mobile, no cross-device
// regression coverage existed). Three real device profiles, not just resized
// windows: a small phone, a large phone, and desktop. Kept separate from
// vitest (e2e/ vs src/) — these need a running app and a real browser, so
// they are opt-in via `npm run test:e2e`, and CI runs them in their own job
// with a database service (unlike the unit suite, which mocks all I/O).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // All three profiles are Chromium-based so CI installs a single browser
  // engine; WebKit/Firefox coverage is a deliberate non-goal at this stage.
  projects: [
    { name: 'mobile-small', use: { ...devices['Galaxy S9+'] } },
    { name: 'mobile-large', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  // CI runs the production build (already built by the workflow); locally the
  // dev server is reused if one is already running.
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
