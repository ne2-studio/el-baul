import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const API_BASE_URL = 'http://localhost:5051';

// Shared by every spec in this directory only — not app/e2e/, which has its own equivalent
// logic in smoke.spec.ts. Two independent suites, no cross-suite coupling.
export async function loginAs(page: Page, userButtonName: 'Admin User' | 'Normal User'): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await page.waitForURL('**/authorize**', { timeout: 15_000 });
  await page.getByRole('button', { name: userButtonName }).click();
  // Don't just wait for localhost:3000/** — that glob also matches the transient /callback
  // screen the SPA shows while it's still exchanging the code for a token.
  await page.waitForURL((url) => url.pathname === '/baules' || url.pathname === '/empty', {
    timeout: 15_000,
  });

  const accessToken = await page.evaluate(() => {
    const raw = localStorage.getItem('oidc.user:http://localhost:5000:el-baul-app');
    return raw ? JSON.parse(raw).access_token : null;
  });
  expect(accessToken, 'expected an access token in localStorage after login').toBeTruthy();
  return accessToken as string;
}

export async function createBaulViaApi(page: Page, accessToken: string, name: string): Promise<string> {
  const response = await page.request.post(`${API_BASE_URL}/api/baules`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name, description: null },
  });
  expect(response.ok(), `failed to create baúl: ${response.status()}`).toBeTruthy();
  const body = await response.json();
  return body.id as string;
}
