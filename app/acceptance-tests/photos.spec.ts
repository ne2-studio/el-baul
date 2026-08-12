import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { loginAs, createBaulViaApi } from './helpers';

const FIXTURE_PHOTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/test-photo.png');

test('create baúl → create chapter → upload photo → move photo → delete photo', async ({ page }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Photos test baúl ${Date.now()}`);
  await page.goto(`/baules/${baulId}`);
  // El baúl abre en Historia (la pestaña de recuerdos) por defecto — createChapter() necesita
  // el FAB de Capítulos.
  await page.getByRole('button', { name: /Capítulos/ }).click();

  // Two chapters: the second is the move target below.
  const chapter1Name = `Capítulo uno ${Date.now()}`;
  const chapter2Name = `Capítulo dos ${Date.now()}`;
  await createChapter(page, chapter1Name);
  await createChapter(page, chapter2Name);

  await page.getByText(chapter1Name).click();
  await page.waitForURL(/\/capitulos\//);
  // El capítulo abre en Recuerdos por defecto — el FAB "Subir fotos" solo vive en Fotos.
  await page.getByRole('button', { name: /Fotos/ }).click();

  // Upload: the "Subir fotos" FAB now navigates straight to the upload screen (empty state)
  // instead of opening the native picker itself — the file input only exists there.
  await page.getByRole('button', { name: 'Subir fotos' }).click();
  await page.waitForURL(/\/confirmar/);
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_PHOTO);
  await page.getByRole('button', { name: 'Subir fotos' }).click();
  await expect(page.getByText(/ya está a salvo/)).toBeVisible({ timeout: 15_000 });
  await page.waitForURL(/\/capitulos\/[^/]+$/);
  await page.getByRole('button', { name: /Fotos/ }).click();

  // Move to chapter 2.
  await page.locator('button:has(img[alt="Foto"])').first().click();
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await page.getByRole('button', { name: 'Mover a otro capítulo' }).click();
  await page.getByRole('button', { name: chapter2Name }).click();
  await page.getByRole('button', { name: 'Mover aquí' }).click();
  await expect(page.getByText('Foto movida')).toBeVisible({ timeout: 10_000 });
  await page.waitForURL(/\/capitulos\//);
  await page.getByRole('button', { name: /Fotos/ }).click();

  // Delete (now in chapter 2).
  await page.locator('button:has(img[alt="Foto"])').first().click();
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await page.getByRole('button', { name: 'Borrar foto' }).click();
  await page.getByRole('textbox', { name: 'Motivo de la retirada' }).fill('E2E test cleanup');
  await page.getByRole('button', { name: 'Sí, borrar foto' }).click();
  await expect(page.getByText('La foto ha sido borrada')).toBeVisible({ timeout: 10_000 });
});

async function createChapter(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: 'Acciones' }).click();
  await page.getByRole('button', { name: 'Nuevo capítulo' }).click();
  await page.getByPlaceholder('Verano 2018').fill(name);
  await page.getByRole('button', { name: 'Crear capítulo' }).click();
  await expect(page.getByPlaceholder('Verano 2018')).toBeHidden({ timeout: 10_000 });
}
