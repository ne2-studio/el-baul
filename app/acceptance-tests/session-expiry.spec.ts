import { test, expect } from '@playwright/test';
import { loginAs, createBaulViaApi } from './helpers';

// Reproduces a session that's still valid client-side (OIDC user in localStorage) but has been
// rejected server-side (expired/invalid token) — the exact scenario the app used to mishandle:
// a generic error toast that never went away, with no path back to the sign-in screen.
test('a 401 from the API signs the user out locally and redirects to the sign-in screen', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (err) => pageErrors.push(err));

  const accessToken = await loginAs(page, 'Admin User');
  const baulName = `Session expiry test baúl ${Date.now()}`;
  await createBaulViaApi(page, accessToken, baulName);

  await page.goto('/baules');
  await expect(page.getByText(baulName)).toBeVisible();

  // Every subsequent API call now looks like an expired/invalid session, regardless of which
  // call site triggers it first (app-config fetch, baúles load, ...).
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Sesión caducada' }),
    })
  );

  await page.reload();

  await page.waitForURL((url) => url.pathname === '/' && url.searchParams.get('redirectTo') === '/baules', {
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();

  // The stale OIDC user must actually be gone — not just visually on the login screen while a
  // stale token still sits in storage waiting to 401 again on the next request.
  const storedUser = await page.evaluate(() =>
    localStorage.getItem('oidc.user:http://localhost:5000:el-baul-app')
  );
  expect(storedUser).toBeNull();

  expect(pageErrors, pageErrors.map(String).join('\n')).toEqual([]);
});
