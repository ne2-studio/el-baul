import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // No retries, including in CI: this is the nightly signal against real infra (see
  // .github/workflows/e2e-nightly.yml), and Playwright treats a test that fails then passes
  // on retry as "flaky" rather than "failed" — exit code 0. A retry would silently hide a
  // real backend error behind a green build instead of surfacing it.
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
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
