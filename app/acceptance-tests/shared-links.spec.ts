import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import {
  createBaulRecuerdoViaApi,
  createBaulViaApi,
  createChapterViaApi,
  loginAs,
  uploadPhotoViaApi,
} from './helpers';

const FIXTURE_PHOTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/test-photo.png');

test.beforeEach(async ({ page }) => {
  await installShareSpy(page);
});

test('share recuerdo from the feed → public landing renders Open Graph metadata', async ({ page }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulName = `Share recuerdo baúl ${Date.now()}`;
  const baulId = await createBaulViaApi(page, accessToken, baulName);
  const recuerdoText = `Recuerdo compartido ${Date.now()}`;
  await createBaulRecuerdoViaApi(page, accessToken, baulId, recuerdoText);

  await page.goto(`/baules/${baulId}`);
  // La pestaña de recuerdos del baúl se llama "Historia".
  await page.getByRole('button', { name: /Historia/ }).click();
  await expect(page.getByText(recuerdoText)).toBeVisible();

  await page.getByRole('button', { name: 'Compartir recuerdo' }).click();
  const shared = await lastShare(page);

  expect(shared.title).toBe(`Recuerdo de ${baulName}`);
  expect(shared.url).toContain('/s/');

  await page.goto(shared.url);
  await expect(page.locator('blockquote')).toContainText(recuerdoText);
  await expect(page.getByRole('link', { name: 'Ver en El Baúl' })).toHaveAttribute(
    'href',
    new RegExp(`/baules/${baulId}\\?entry=link$`),
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', `Un recuerdo de ${baulName}`);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', recuerdoText);
});

test('share photo from the viewer → public landing includes the shared image preview', async ({ page }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulName = `Share foto baúl ${Date.now()}`;
  const baulId = await createBaulViaApi(page, accessToken, baulName);
  const chapterId = await createChapterViaApi(page, accessToken, baulId, `Capítulo ${Date.now()}`);
  const photo = await uploadPhotoViaApi(page, accessToken, chapterId, FIXTURE_PHOTO);

  await page.goto(`/baules/${baulId}/capitulos/${chapterId}/foto/${photo.id}`);
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await page.getByRole('button', { name: 'Compartir foto' }).click();
  const shared = await lastShare(page);

  expect(shared.title).toBe(`Foto de ${baulName}`);
  expect(shared.url).toContain('/s/');

  await page.goto(shared.url);
  await expect(page.locator('img.photo')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver en El Baúl' })).toHaveAttribute(
    'href',
    new RegExp(`/baules/${baulId}/capitulos/${chapterId}/foto/${photo.id}\\?entry=link$`),
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', `Una foto de ${baulName}`);
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(ogImage).toContain('/lite/photos/');
});

async function installShareSpy(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        (window as Window & { __lastShare?: ShareData }).__lastShare = data;
      },
    });
  });
}

async function lastShare(page: Page): Promise<{ title: string; text: string; url: string }> {
  await page.waitForFunction(() => Boolean((window as Window & { __lastShare?: ShareData }).__lastShare?.url));
  return page.evaluate(() => {
    const share = (window as Window & { __lastShare?: ShareData }).__lastShare;
    if (!share?.url) throw new Error('Expected Share.share to be called with a URL');
    return {
      title: share.title ?? '',
      text: share.text ?? '',
      url: share.url,
    };
  });
}
