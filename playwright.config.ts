import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Playwright E2E configuration for Yemen Telecom.
 *
 * Boots the Vite development server on http://localhost:5173 and runs the specs
 * located in the `e2e/` directory. The dev server proxies `/api` to the
 * production API host (see vite.config.ts), so these tests exercise the real
 * backend through the normal SPA login / role flow.
 *
 * Login credentials are read from environment variables and fall back to the
 * seeded demo accounts (`manager` / `agent` / `seller`). Override them per
 * environment, e.g.:
 *   E2E_MANAGER_USER=manager E2E_MANAGER_PASS='...' npm run test:e2e
 *
 * Tracing, video (on failure) and HTML reporting are enabled per the spec.
 */

const PORT = 5173;
// Pin Vite's root to the repo root so the dev server always serves index.html,
// independent of the working directory Playwright launches the command from.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

export default defineConfig({
  testDir: './e2e',
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
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ar',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `ROOT` is passed positionally (Vite 6 does not accept `--root` as a flag).
    command: `npx vite ${ROOT} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
