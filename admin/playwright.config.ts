import { defineConfig, devices } from '@playwright/test';

// Verifies the built admin image + el-baul-api-lite (own compose file, own setup/teardown).
// Kept separate from app/acceptance-tests because the admin backoffice has a smaller behavioral
// surface and its own deployment artifact.
export default defineConfig({
  testDir: './acceptance-tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']]
    : 'list',
  outputDir: './test-results',
  globalSetup: './acceptance-tests/global-setup.ts',
  globalTeardown: './acceptance-tests/global-teardown.ts',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
