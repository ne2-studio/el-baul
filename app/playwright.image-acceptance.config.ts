import { defineConfig, devices } from '@playwright/test';

// Deliberately a separate config from playwright.config.ts, not a variant of it — this suite
// verifies the built frontend image + el-baul-api-lite (own compose file, own setup/teardown,
// own report/output dirs), the nightly suite verifies the full docker-compose.yaml stack built
// from source. Different subjects under test, different failure modes; a shared config would
// let a change made for one silently affect the other.
export default defineConfig({
  testDir: './e2e-image-acceptance',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report-image-acceptance', open: 'never' }], ['list']]
    : 'list',
  outputDir: './test-results-image-acceptance',
  globalSetup: './e2e-image-acceptance/global-setup.ts',
  globalTeardown: './e2e-image-acceptance/global-teardown.ts',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
