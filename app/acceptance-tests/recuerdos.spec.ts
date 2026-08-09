import { test, expect } from '@playwright/test';
import { createBaulRecuerdoViaApi, createBaulViaApi, getCurrentPersonaViaApi, loginAs } from './helpers';

test('create recuerdo → edit it → open author persona from avatar', async ({ page }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Recuerdos test baúl ${Date.now()}`);
  const currentPersona = await getCurrentPersonaViaApi(page, accessToken, baulId);
  const recuerdoText = `Recuerdo acceptance ${Date.now()}`;
  const recuerdo = await createBaulRecuerdoViaApi(page, accessToken, baulId, recuerdoText);

  expect(recuerdo.personaId).toBe(currentPersona.id);

  await page.goto(`/baules/${baulId}`);
  // La pestaña de recuerdos del baúl se llama "Historia" (distinto del "Recuerdos" que sigue
  // usándose dentro de un capítulo; la ficha de una persona ya no tiene esta pestaña).
  await page.getByRole('button', { name: /Historia/ }).click();
  await expect(page.getByText(recuerdoText)).toBeVisible();

  const editedText = `Recuerdo editado acceptance ${Date.now()}`;
  await page.getByRole('button', { name: 'Editar recuerdo' }).click();
  await page.getByRole('textbox', { name: 'Contenido del recuerdo' }).fill(editedText);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText(editedText)).toBeVisible();
  await expect(page.getByText(recuerdoText)).not.toBeVisible();

  await page.getByRole('button', { name: 'Ver perfil de Yo' }).click();
  await page.waitForURL((url) => url.pathname === `/baules/${baulId}/personas/${currentPersona.id}`, {
    timeout: 10_000,
  });
  await expect(page.getByRole('heading', { name: currentPersona.nickname })).toBeVisible();
});
