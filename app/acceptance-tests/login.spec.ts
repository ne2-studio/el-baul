import { test, expect } from '@playwright/test';
import { loginAs, createBaulViaApi } from './helpers';

// Same journey as e2e-tests/smoke.spec.ts (login → seed a baúl → reach it), against a
// completely different stack: the actual frontend image under test (APP_IMAGE) + el-baul-api-lite
// instead of a from-source rebuild against the full docker-compose.yaml stack. Kept as its own
// file rather than shared/imported — these are two independent suites (own config, own
// setup/teardown) that happen to check a similar path today and may diverge later.
test('user can log in with Google (fake-oidc) and reach their baúl', async ({ page }) => {
  const pageErrors: Error[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err));
  page.on('response', (res) => {
    if (res.status() >= 400) {
      failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });

  const accessToken = await loginAs(page, 'Admin User');

  // A freshly-seeded fake-oidc admin user has zero baúles, which routes through the
  // onboarding carousel and then the create-baúl screen instead of an actual baúl. Seed one
  // via the API so this test deterministically exercises the real workspace screen, not the
  // onboarding/create-baúl flow.
  const baulName = `Login test baúl ${Date.now()}`;
  const baulId = await createBaulViaApi(page, accessToken, baulName);

  // Deep link straight to the seeded baúl — there is no "list of baúles" screen to land on
  // anymore, and this exercises the same "land directly in a baúl by id" path deep links rely on.
  await page.goto(`/baules/${baulId}`);

  await expect(page.getByRole('button', { name: 'Cambiar de baúl' })).toBeVisible();
  await expect(page.getByText(baulName)).toBeVisible();
  // El baúl abre en Recuerdos por defecto.
  await expect(page.getByText('Todavía no hay recuerdos')).toBeVisible();

  expect(pageErrors, pageErrors.map(String).join('\n')).toEqual([]);
  expect(failedRequests, failedRequests.join('\n')).toEqual([]);
});
