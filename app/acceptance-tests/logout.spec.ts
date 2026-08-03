import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

// fake-oidc has no end_session_endpoint (see docker-compose.yaml), so this only exercises
// the local-signout fallback path in App.tsx's handleSignOut — the real end_session
// round-trip against Zitadel can't be automated here and needs manual verification.
test('user can sign out and lands back on the sign-in screen', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (err) => pageErrors.push(err));

  await loginAs(page, 'Admin User');

  await page.getByRole('button', { name: 'Abrir menú de cuenta' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();

  await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();

  const storedUser = await page.evaluate(() =>
    localStorage.getItem('oidc.user:http://localhost:5000:el-baul-app')
  );
  expect(storedUser).toBeNull();

  expect(pageErrors, pageErrors.map(String).join('\n')).toEqual([]);
});
