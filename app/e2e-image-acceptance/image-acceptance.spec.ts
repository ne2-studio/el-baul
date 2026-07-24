import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:5051';

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

  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await page.waitForURL('**/authorize**', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Admin User' }).click();
  // Don't just wait for localhost:3000/** — that glob also matches the transient
  // /callback screen ("Preparando tus baúles…") the SPA shows while it's still
  // exchanging the code for a token, which raced the localStorage read below.
  await page.waitForURL((url) => url.pathname === '/baules' || url.pathname === '/empty', {
    timeout: 15_000,
  });

  // A freshly-seeded fake-oidc admin user has zero baúles, which routes to a
  // completely different empty-state screen instead of the real home. Seed one via the
  // API so this test deterministically exercises the actual home screen, not the empty state.
  const accessToken = await page.evaluate(() => {
    const raw = localStorage.getItem('oidc.user:http://localhost:5000:el-baul-app');
    return raw ? JSON.parse(raw).access_token : null;
  });
  expect(accessToken, 'expected an access token in localStorage after login').toBeTruthy();

  // Unlike the full-stack suite, el-baul-api-lite starts empty on every run (nothing persists
  // across container restarts) — no risk of colliding with a prior run's leftover baúl, but
  // the name stays unique anyway in case a test is ever re-run against a still-live container.
  const baulName = `Image acceptance test baúl ${Date.now()}`;
  const createResponse = await page.request.post(`${API_BASE_URL}/api/baules`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name: baulName, description: null },
  });
  expect(createResponse.ok(), `failed to seed a baúl: ${createResponse.status()}`).toBeTruthy();

  await page.goto('/baules');

  await expect(page.getByRole('heading', { name: 'El Baúl' })).toBeVisible();
  await expect(page.getByText('Mis baúles')).toBeVisible();
  await expect(page.getByText(baulName)).toBeVisible();

  expect(pageErrors, pageErrors.map(String).join('\n')).toEqual([]);
  expect(failedRequests, failedRequests.join('\n')).toEqual([]);
});
