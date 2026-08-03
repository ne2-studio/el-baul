import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

export const API_BASE_URL = 'http://localhost:5051';

// Shared by every spec in this directory only — not /e2e-tests/, which has its own equivalent
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

export async function createPersonaViaApi(
  page: Page,
  accessToken: string,
  baulId: string,
  nickname: string,
): Promise<string> {
  const response = await page.request.post(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { nickname },
  });
  expect(response.ok(), `failed to create persona: ${response.status()}`).toBeTruthy();
  const body = await response.json();
  return body.id as string;
}

export async function getCurrentPersonaViaApi(
  page: Page,
  accessToken: string,
  baulId: string,
): Promise<{ id: string; nickname: string }> {
  const response = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(response.ok(), `failed to list personas: ${response.status()}`).toBeTruthy();
  const personas = await response.json();
  const persona = personas.find((p: { canEdit?: boolean; role?: string }) => p.canEdit || p.role === 'custodio');
  expect(persona, 'expected current user persona to exist for the baúl').toBeTruthy();
  return { id: persona.id as string, nickname: persona.nickname as string };
}

export async function createBaulRecuerdoViaApi(
  page: Page,
  accessToken: string,
  baulId: string,
  text: string,
): Promise<{ id: string; personaId?: string }> {
  const response = await page.request.post(`${API_BASE_URL}/api/baules/${baulId}/recuerdos`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { text },
  });
  expect(response.ok(), `failed to create recuerdo: ${response.status()}`).toBeTruthy();
  const body = await response.json();
  return { id: body.id as string, personaId: body.personaId as string | undefined };
}

export async function createChapterViaApi(
  page: Page,
  accessToken: string,
  baulId: string,
  name: string,
): Promise<string> {
  const response = await page.request.post(`${API_BASE_URL}/api/baules/${baulId}/chapters`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name },
  });
  expect(response.ok(), `failed to create chapter: ${response.status()}`).toBeTruthy();
  const body = await response.json();
  return body.id as string;
}

export async function uploadPhotoViaApi(
  page: Page,
  accessToken: string,
  chapterId: string,
  filePath: string,
): Promise<{ id: string; fullUrl: string; thumbnailUrl: string }> {
  const response = await page.request.post(`${API_BASE_URL}/api/chapters/${chapterId}/photos`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    multipart: {
      file: {
        name: 'test-photo.png',
        mimeType: 'image/png',
        buffer: fs.readFileSync(filePath),
      },
      clientUploadId: randomUUID(),
    },
  });
  expect(response.ok(), `failed to upload photo: ${response.status()}`).toBeTruthy();
  const body = await response.json();
  return { id: body.id as string, fullUrl: body.fullUrl as string, thumbnailUrl: body.thumbnailUrl as string };
}
