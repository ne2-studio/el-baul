import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test('admin user can navigate to the dashboard', async ({ page }) => {
  await loginAs(page, 'Admin User');
  await page.getByRole('link', { name: 'Dashboard' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Usuarios registrados')).toBeVisible();
  await expect(page.getByText('Baúles creados')).toBeVisible();
  await expect(page.getByText('Fotos totales')).toBeVisible();
  await expect(page.getByText('Fotos subidas hoy')).toBeVisible();
});
