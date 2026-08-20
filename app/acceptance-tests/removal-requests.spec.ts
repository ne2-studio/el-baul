import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page, type Browser, type BrowserContext } from '@playwright/test';
import { loginAs, createBaulViaApi, dismissContributionSuggestionIfShown, API_BASE_URL } from './helpers';

const FIXTURE_PHOTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/test-photo.png');

// Needs two identities, same reason as personas.spec.ts's global-invite-link join step:
// submitting a removal request is only possible for a non-admin member (PhotoViewer.tsx only
// shows "Solicitar retirada" when !isAdmin), and the baúl's creator/custodian is always admin
// on their own baúl — they can never see that option, only the direct "Borrar foto" delete.

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
  baulId: string,
  browser: Browser,
): Promise<{ guestContext: BrowserContext; guestPage: Page }> {
  await adminPage.goto(`/baules/${baulId}`);
  await dismissContributionSuggestionIfShown(adminPage);
  await adminPage.getByRole('button', { name: 'Menú' }).click();
  await adminPage.getByRole('menuitem', { name: 'Invitar a la familia' }).click();
  const linkLocator = adminPage.getByText(/\/invitacion\/baul\//);
  await expect(linkLocator).toBeVisible();
  const linkText = (await linkLocator.textContent())!;
  const token = linkText.match(/\/invitacion\/baul\/([^\s"']+)/)?.[1];
  expect(token, `expected to find an invite token in "${linkText}"`).toBeTruthy();
  await adminPage.getByRole('button', { name: 'Cerrar' }).click();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await loginAs(guestPage, 'Normal User');
  await guestPage.goto(`/invitacion/baul/${token}`);
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
  // once the suite had more concurrent load from the other specs, not in isolation).
  await expect(guestPage.getByText(/enviada/)).toBeVisible({ timeout: 10_000 });
}

test('submit removal request → approve (photo is removed)', async ({ page, browser }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Removal approve test baúl ${Date.now()}`);
  const photoId = await uploadLoosePhotoViaApi(page, accessToken, baulId);
  const { guestContext, guestPage } = await inviteAndAcceptCollaborator(page, baulId, browser);

  await submitRemovalRequest(guestPage, baulId, photoId);
  await guestContext.close();

  await page.goto(`/baules/${baulId}`);
  await dismissContributionSuggestionIfShown(page);
  await page.getByRole('button', { name: 'Menú' }).click();
  await page.getByRole('menuitem', { name: 'Solicitudes de eliminación' }).click();
  await page.waitForURL(/\/eliminar-solicitudes\//);
  await page.getByRole('button', { name: 'Borrar foto' }).click();
  await expect(page.getByText('La foto ha sido eliminada')).toBeVisible({ timeout: 10_000 });
});

test('submit removal request → reject (photo is kept)', async ({ page, browser }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Removal reject test baúl ${Date.now()}`);
  const photoId = await uploadLoosePhotoViaApi(page, accessToken, baulId);
  const { guestContext, guestPage } = await inviteAndAcceptCollaborator(page, baulId, browser);

  await submitRemovalRequest(guestPage, baulId, photoId);
  await guestContext.close();

  await page.goto(`/baules/${baulId}`);
  await dismissContributionSuggestionIfShown(page);
  await page.getByRole('button', { name: 'Menú' }).click();
  await page.getByRole('menuitem', { name: 'Solicitudes de eliminación' }).click();
  await page.waitForURL(/\/eliminar-solicitudes\//);
  await page.getByRole('button', { name: 'Mantener foto' }).click();
  await expect(page.getByText('La foto se ha conservado')).toBeVisible({ timeout: 10_000 });
});
