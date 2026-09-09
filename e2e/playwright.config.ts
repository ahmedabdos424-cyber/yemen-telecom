import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for Yemen Telecom (CI-compatible).
 *
 * CI (ci.yml) builds the frontend, starts the production preview server on
 * :4173 with VITE_PROXY_TARGET pointing at the local API, and runs this config
 * with `--project="Desktop Chrome"`. The API server is booted beforehand in the
 * CI job, so this config does NOT own a webServer — it only consumes E2E_BASE_URL.
 *
 * Local runs: `npx vite preview --port 4173` (with the API running) then
 * `npx playwright test --config=e2e/playwright.config.ts`.
 *
 * Login credentials are read from environment variables and fall back to the
 * seeded demo accounts (see e2e/helpers.ts), e.g.:
 *   E2E_MANAGER_USER=manager E2E_MANAGER_PASS='...' npx playwright test ...
 */

export default defineConfig({
  testDir: './',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: './playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ar',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});