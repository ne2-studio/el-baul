import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test('unauthenticated visitor is sent to fake-oidc login', async ({ page }) => {
  await page.goto('/dashboard');

  await page.waitForURL('**/authorize**', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Admin User' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Normal User' })).toBeVisible();
});

test('admin user can log in and reach the backoffice shell', async ({ page }) => {
  const pageErrors: Error[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err));
  page.on('response', (res) => {
    if (res.status() >= 400) {
      failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });

  await loginAs(page, 'Admin User');

  await expect(page.getByRole('heading', { name: 'El Baúl — Backoffice' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

  expect(pageErrors, pageErrors.map(String).join('\n')).toEqual([]);
  expect(failedRequests, failedRequests.join('\n')).toEqual([]);
});
