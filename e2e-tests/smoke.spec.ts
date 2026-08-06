import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:5050';
const IMGPROXY_PREFIX = 'http://localhost:8081/';

test('user can log in with Google (fake-oidc) and reach their baúl', async ({ page }) => {
  const pageErrors: Error[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err));
  page.on('response', (res) => {
    // imgproxy 4xx noise on seeded-but-missing photos is a pre-existing data gap in
    // this stack, not a code bug — see the `verify` skill.
    if (res.status() >= 400 && !res.url().startsWith(IMGPROXY_PREFIX)) {
      failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await page.waitForURL('**/authorize**', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Admin User' }).click();
  // Don't just wait for localhost:3000/** — that glob also matches the transient
  // /callback screen ("Preparando tus baúles…") the SPA shows while it's still
  // exchanging the code for a token, which raced the localStorage read below. There is no
  // "list of baúles" screen to land on anymore ("/baules" only resolves and redirects
  // further): a genuinely fresh fake-oidc admin user has zero baúles and has never seen
  // onboarding, so lands on /onboarding first; a returning one with baúles already lands
  // directly inside one of them (/baules/<id>) — its own CurrentBaul or the first one.
  await page.waitForURL(
    (url) => /^\/baules\/[^/]+$/.test(url.pathname) || url.pathname === '/baules/nuevo' || url.pathname === '/onboarding',
    { timeout: 15_000 },
  );

  // A freshly-seeded fake-oidc admin user has zero baúles, which routes through the
  // onboarding carousel and then the create-baúl screen instead of an actual baúl. Seed one
  // via the API (same token-extraction technique the `run` skill documents) so this test
  // deterministically exercises the real workspace screen, not the onboarding/create-baúl
  // flow — and so it doesn't depend on this admin's pre-existing CurrentBaul from a prior run.
  const accessToken = await page.evaluate(() => {
    const raw = localStorage.getItem('oidc.user:http://localhost:5000:el-baul-app');
    return raw ? JSON.parse(raw).access_token : null;
  });
  expect(accessToken, 'expected an access token in localStorage after login').toBeTruthy();

  // Unique per run: repeated local runs don't wipe volumes (see global-teardown.ts), so
  // a fixed name would eventually collide with a leftover from a prior run and break
  // Playwright's strict-mode locator below ("resolved to 2 elements").
  const baulName = `Smoke test baúl ${Date.now()}`;
  const createResponse = await page.request.post(`${API_BASE_URL}/api/baules`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name: baulName, description: null },
  });
  expect(createResponse.ok(), `failed to seed a baúl: ${createResponse.status()}`).toBeTruthy();
  const createdBaul = await createResponse.json();

  // Deep link straight to the seeded baúl (not "/baules" — this admin's CurrentBaul was
  // already resolved to a pre-existing baúl, if any, at the login redirect above) — exercises
  // the same "land directly in a baúl by id" path deep links rely on.
  await page.goto(`/baules/${createdBaul.id}`);

  await expect(page.getByRole('button', { name: 'Cambiar de baúl' })).toBeVisible();
  await expect(page.getByText(baulName)).toBeVisible();
  await expect(page.getByText('Este baúl está vacío')).toBeVisible();

  expect(pageErrors, pageErrors.map(String).join('\n')).toEqual([]);
  expect(failedRequests, failedRequests.join('\n')).toEqual([]);
});
