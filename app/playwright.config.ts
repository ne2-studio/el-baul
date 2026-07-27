import { defineConfig, devices } from '@playwright/test';

// Verifies the built frontend image + el-baul-api-lite (own compose file, own setup/teardown).
// Deliberately a separate package from /e2e-tests/ at the repo root, which verifies the full
// docker-compose.yaml stack built from source — different subjects under test, different
// failure modes; a shared config would let a change made for one silently affect the other.
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
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
