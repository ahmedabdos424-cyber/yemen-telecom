const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './qa-tests',
  testMatch: '**/*.spec.cjs',
  timeout: 60000,
  retries: 1,
  workers: 1,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: [
    ['html', { outputFolder: './qa-reports/html-report', open: 'never' }],
    ['junit', { outputFile: './qa-reports/junit-results.xml' }],
    ['list'],
  ],
});
