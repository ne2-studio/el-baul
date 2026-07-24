import { test, expect } from '@playwright/test';
import { loginAs, createBaulViaApi } from './helpers';

// Same journey as e2e/smoke.spec.ts (login → seed a baúl → see it on /baules), against a
// completely different stack: the actual frontend image under test (APP_IMAGE) + el-baul-api-lite
// instead of a from-source rebuild against the full docker-compose.yaml stack. Kept as its own
// file rather than shared/imported — these are two independent suites (own config, own
// setup/teardown) that happen to check a similar path today and may diverge later.
test('user can log in with Google (fake-oidc) and reach the El Baúl home screen', async ({ page }) => {
  const pageErrors: Error[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err));
  page.on('response', (res) => {
    if (res.status() >= 400) {
      failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });

  const accessToken = await loginAs(page, 'Admin User');

  // A freshly-seeded fake-oidc admin user has zero baúles, which routes to a completely
  // different empty-state screen instead of the real home. Seed one via the API so this test
  // deterministically exercises the actual home screen, not the empty state.
  const baulName = `Login test baúl ${Date.now()}`;
  await createBaulViaApi(page, accessToken, baulName);

  await page.goto('/baules');

  await expect(page.getByRole('heading', { name: 'El Baúl' })).toBeVisible();
  await expect(page.getByText('Mis baúles')).toBeVisible();
  await expect(page.getByText(baulName)).toBeVisible();

  expect(pageErrors, pageErrors.map(String).join('\n')).toEqual([]);
  expect(failedRequests, failedRequests.join('\n')).toEqual([]);
});
