import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page, type Browser, type BrowserContext } from '@playwright/test';
import { loginAs, createBaulViaApi, API_BASE_URL } from './helpers';

const FIXTURE_PHOTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/test-photo.png');

// Needs two identities, same reason as personas.spec.ts's accept-invite step: submitting a
// removal request is only possible for a non-admin member (PhotoViewer.tsx only shows
// "Solicitar retirada" when !isAdmin), and the baúl's creator/custodian is always admin on
// their own baúl — they can never see that option, only the direct "Retirar foto" delete.

async function uploadLoosePhotoViaApi(page: Page, accessToken: string, baulId: string): Promise<string> {
  const response = await page.request.post(`${API_BASE_URL}/api/baules/${baulId}/photos/sueltas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    multipart: {
      File: {
        name: 'test-photo.png',
        mimeType: 'image/png',
        buffer: fs.readFileSync(FIXTURE_PHOTO),
      },
      ClientUploadId: randomUUID(),
    },
  });
  expect(response.ok(), `failed to upload photo: ${response.status()}`).toBeTruthy();
  const body = await response.json();
  return body.id as string;
}

async function inviteAndAcceptCollaborator(
  adminPage: Page,
  accessToken: string,
  baulId: string,
  browser: Browser,
): Promise<{ guestContext: BrowserContext; guestPage: Page }> {
  await adminPage.goto(`/baules/${baulId}`);
  await adminPage.getByRole('button', { name: /Personas/ }).click();
  await adminPage.getByRole('button', { name: 'Nueva persona' }).click();
  const nickname = `Colaborador ${Date.now()}`;
  await adminPage.getByPlaceholder('Ej. Abuela, Tío Juan…').fill(nickname);
  await adminPage.getByRole('button', { name: 'Añadir' }).click();
  await expect(adminPage.getByPlaceholder('Ej. Abuela, Tío Juan…')).toBeHidden({ timeout: 10_000 });

  const personasResponse = await adminPage.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(personasResponse.ok()).toBeTruthy();
  const personas = await personasResponse.json();
  const persona = personas.find((p: { nickname: string }) => p.nickname === nickname);
  expect(persona, `expected to find persona named ${nickname}`).toBeTruthy();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await loginAs(guestPage, 'Normal User');
  await guestPage.goto(`/invitacion/persona/${persona.id}`);
  await guestPage.getByRole('button', { name: 'Unirme al Baúl' }).click();
  await guestPage.waitForURL((url) => /\/baules\/[^/]+$/.test(url.pathname), { timeout: 15_000 });

  return { guestContext, guestPage };
}

async function submitRemovalRequest(guestPage: Page, baulId: string, photoId: string) {
  await guestPage.goto(`/baules/${baulId}/fotos-sueltas/foto/${photoId}`);
  await guestPage.getByRole('button', { name: 'Más opciones' }).click();
  await guestPage.getByRole('button', { name: 'Solicitar retirada' }).click();
  await guestPage
    .getByPlaceholder('Cuéntanos por qué no quieres que esta foto aparezca en este baúl')
    .fill('E2E test: please remove this photo');
  await guestPage.getByRole('button', { name: 'Enviar solicitud' }).click();
  // Without this wait, guestContext.close() right after returning can abort the POST before
  // it completes — the admin side then never sees a pending request (this raced intermittently
  // once the suite had more concurrent load from the other specs, not in isolation). .first():
  // there are two overlapping "enviada" success signals on this screen (an async-action toast
  // and a separate self-dismissing ConfirmationToast) — either one confirms success.
  await expect(guestPage.getByText(/enviada/).first()).toBeVisible({ timeout: 10_000 });
}

test('submit removal request → approve (photo is removed)', async ({ page, browser }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Removal approve test baúl ${Date.now()}`);
  const photoId = await uploadLoosePhotoViaApi(page, accessToken, baulId);
  const { guestContext, guestPage } = await inviteAndAcceptCollaborator(page, accessToken, baulId, browser);

  await submitRemovalRequest(guestPage, baulId, photoId);
  await guestContext.close();

  await page.goto(`/baules/${baulId}`);
  await page.getByRole('button', { name: 'Opciones del baúl' }).click();
  await page.getByRole('menuitem', { name: 'Solicitudes de eliminación' }).click();
  await page.waitForURL(/\/eliminar-solicitudes\//);
  await page.getByRole('button', { name: 'Retirar foto' }).click();
  await expect(page.getByText('La foto ha sido eliminada')).toBeVisible({ timeout: 10_000 });
});

test('submit removal request → reject (photo is kept)', async ({ page, browser }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Removal reject test baúl ${Date.now()}`);
  const photoId = await uploadLoosePhotoViaApi(page, accessToken, baulId);
  const { guestContext, guestPage } = await inviteAndAcceptCollaborator(page, accessToken, baulId, browser);

  await submitRemovalRequest(guestPage, baulId, photoId);
  await guestContext.close();

  await page.goto(`/baules/${baulId}`);
  await page.getByRole('button', { name: 'Opciones del baúl' }).click();
  await page.getByRole('menuitem', { name: 'Solicitudes de eliminación' }).click();
  await page.waitForURL(/\/eliminar-solicitudes\//);
  await page.getByRole('button', { name: 'Mantener foto' }).click();
  await expect(page.getByText('La foto se ha conservado')).toBeVisible({ timeout: 10_000 });
});
