import { test, expect } from '@playwright/test';
import { createBaulRecuerdoViaApi, createBaulViaApi, getCurrentPersonaViaApi, loginAs } from './helpers';

test('create recuerdo → see it in feed → open author persona from avatar', async ({ page }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Recuerdos test baúl ${Date.now()}`);
  const currentPersona = await getCurrentPersonaViaApi(page, accessToken, baulId);
  const recuerdoText = `Recuerdo acceptance ${Date.now()}`;
  const recuerdo = await createBaulRecuerdoViaApi(page, accessToken, baulId, recuerdoText);

  expect(recuerdo.personaId).toBe(currentPersona.id);

  await page.goto(`/baules/${baulId}`);
  await page.getByRole('button', { name: /Recuerdos/ }).click();
  await expect(page.getByText(recuerdoText)).toBeVisible();

  await page.getByRole('button', { name: 'Ver perfil de Yo' }).click();
  await page.waitForURL((url) => url.pathname === `/baules/${baulId}/personas/${currentPersona.id}`, {
    timeout: 10_000,
  });
  await expect(page.getByRole('heading', { name: currentPersona.nickname })).toBeVisible();
});
