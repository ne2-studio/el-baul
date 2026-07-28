import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function loginAs(page: Page, userButtonName: 'Admin User' | 'Normal User'): Promise<void> {
  await page.goto('/');
  await page.waitForURL('**/authorize**', { timeout: 15_000 });
  await page.getByRole('button', { name: userButtonName }).click();
  await page.waitForURL((url) => url.origin === 'http://localhost:3001' && url.pathname === '/dashboard', {
    timeout: 15_000,
  });

  const accessToken = await page.evaluate(() => {
    const raw = localStorage.getItem('oidc.user:http://localhost:5000:el-baul-app');
    return raw ? JSON.parse(raw).access_token : null;
  });
  expect(accessToken, 'expected an access token in localStorage after login').toBeTruthy();
}
