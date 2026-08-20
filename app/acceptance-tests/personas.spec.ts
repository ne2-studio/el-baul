import { test, expect } from '@playwright/test';
import { loginAs, createBaulViaApi, API_BASE_URL } from './helpers';

test('create persona → revoke access while still pending → allow invite again', async ({ page }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Personas test baúl ${Date.now()}`);
  await page.goto(`/baules/${baulId}`);

  // La pestaña de personas del baúl se llama "Familia".
  await page.getByRole('button', { name: /Familia/ }).click();
  await page.getByRole('button', { name: 'Nueva persona' }).click();
  const nickname = `Persona ${Date.now()}`;
  await page.getByPlaceholder('Ej. Abuela, Tío Juan…').fill(nickname);
  await page.getByRole('button', { name: 'Añadir' }).click();
  await expect(page.getByPlaceholder('Ej. Abuela, Tío Juan…')).toBeHidden({ timeout: 10_000 });

  const personasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(personasResponse.ok(), `failed to list personas: ${personasResponse.status()}`).toBeTruthy();
  const personas = await personasResponse.json();
  const persona = personas.find((p: { nickname: string }) => p.nickname === nickname);
  expect(persona, `expected to find persona named ${nickname}`).toBeTruthy();
  const personaId = persona.id as string;

  // A pre-provisioned Persona has no account linked yet and no per-persona invite link —
  // only the global invite link can link an account to it; it can still be revoked/restored
  // directly.
  await page.goto(`/baules/${baulId}/personas/${personaId}`);
  await page.getByRole('button', { name: 'Opciones de la persona' }).click();
  await expect(page.getByRole('menuitem', { name: 'Compartir invitación' })).toBeHidden();
  await expect(page.getByRole('menuitem', { name: 'Gestionar acceso' })).toBeHidden();
  await page.getByRole('menuitem', { name: 'Revocar acceso' }).click();
  await page.getByRole('button', { name: 'Revocar acceso' }).click();

  await expect(page.getByText('Sin acceso')).toBeVisible();
  await expect(page.getByText('Forma parte de la historia familiar, pero no puede ver ni colaborar en el contenido.')).toBeVisible();

  const revokedPersonasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(revokedPersonasResponse.ok(), `failed to list revoked personas: ${revokedPersonasResponse.status()}`).toBeTruthy();
  const revokedPersonas = await revokedPersonasResponse.json();
  const revokedPersona = revokedPersonas.find((p: { id: string }) => p.id === personaId);
  expect(revokedPersona).toMatchObject({ id: personaId, nickname, role: 'sin_acceso', status: 'sin_acceso', userId: null });

  await page.getByRole('button', { name: 'Opciones de la persona' }).click();
  await expect(page.getByRole('menuitem', { name: 'Compartir invitación' })).toBeHidden();
  await expect(page.getByRole('menuitem', { name: 'Gestionar acceso' })).toBeHidden();

  await page.getByRole('menuitem', { name: 'Permitir invitación' }).click();
  await page.getByRole('button', { name: 'Opciones de la persona' }).click();
  await expect(page.getByRole('menuitem', { name: 'Compartir invitación' })).toBeHidden();
  await expect(page.getByRole('menuitem', { name: 'Gestionar acceso' })).toBeHidden();

  const restoredPersonasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(restoredPersonasResponse.ok(), `failed to list restored personas: ${restoredPersonasResponse.status()}`).toBeTruthy();
  const restoredPersonas = await restoredPersonasResponse.json();
  const restoredPersona = restoredPersonas.find((p: { id: string }) => p.id === personaId);
  expect(restoredPersona).toMatchObject({ id: personaId, nickname, role: 'colaborador', status: 'pending', userId: null });
});

test('joining via the global invite link → change role → revoke access → allow invite again', async ({ page, browser }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Personas role-change test baúl ${Date.now()}`);
  await page.goto(`/baules/${baulId}`);

  await page.getByRole('button', { name: 'Menú' }).click();
  await page.getByRole('menuitem', { name: 'Invitar a la familia' }).click();
  const linkLocator = page.getByText(/\/invitacion\/baul\//);
  await expect(linkLocator).toBeVisible();
  const linkText = (await linkLocator.textContent())!;
  const token = linkText.match(/\/invitacion\/baul\/([^\s"']+)/)?.[1];
  expect(token, `expected to find an invite token in "${linkText}"`).toBeTruthy();
  await page.getByRole('button', { name: 'Cerrar' }).click();

  // Second identity, second browser context: join via the public global link.
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await loginAs(guestPage, 'Normal User');
  await guestPage.goto(`/invitacion/baul/${token}`);
  await guestPage.getByRole('button', { name: 'Unirme al Baúl' }).click();
  await guestPage.waitForURL((url) => url.pathname === `/baules/${baulId}`, { timeout: 15_000 });
  await guestContext.close();

  const personasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(personasResponse.ok(), `failed to list personas: ${personasResponse.status()}`).toBeTruthy();
  const personas = await personasResponse.json();
  const guestPersona = personas.find((p: { role: string }) => p.role === 'colaborador');
  expect(guestPersona, 'expected an auto-created colaborador persona for the guest').toBeTruthy();
  const personaId = guestPersona.id as string;
  const nickname = guestPersona.nickname as string;

  // The persona is already active (not pending), so "Gestionar acceso" is now offered
  // in the options menu — the role <select> lives inside that modal, not on the page itself.
  await page.goto(`/baules/${baulId}/personas/${personaId}`);
  await page.getByRole('button', { name: 'Opciones de la persona' }).click();
  await page.getByRole('menuitem', { name: 'Gestionar acceso' }).click();
  await page.getByRole('combobox').selectOption('administrador');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await page.getByRole('button', { name: 'Opciones de la persona' }).click();
  await page.getByRole('menuitem', { name: 'Revocar acceso' }).click();
  await page.getByRole('button', { name: 'Revocar acceso' }).click();

  await expect(page.getByText('Sin acceso')).toBeVisible();

  const revokedPersonasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(revokedPersonasResponse.ok(), `failed to list revoked personas: ${revokedPersonasResponse.status()}`).toBeTruthy();
  const revokedPersonas = await revokedPersonasResponse.json();
  const revokedPersona = revokedPersonas.find((p: { id: string }) => p.id === personaId);
  expect(revokedPersona).toMatchObject({ id: personaId, nickname, role: 'sin_acceso', status: 'sin_acceso', userId: null });

  await page.getByRole('button', { name: 'Opciones de la persona' }).click();
  await expect(page.getByRole('menuitem', { name: 'Gestionar acceso' })).toBeHidden();

  await page.getByRole('menuitem', { name: 'Permitir invitación' }).click();

  const restoredPersonasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(restoredPersonasResponse.ok(), `failed to list restored personas: ${restoredPersonasResponse.status()}`).toBeTruthy();
  const restoredPersonas = await restoredPersonasResponse.json();
  const restoredPersona = restoredPersonas.find((p: { id: string }) => p.id === personaId);
  // Reopening no longer re-links the same account self-serve (that required the removed
  // per-persona invite); the row goes back to pending, not active.
  expect(restoredPersona).toMatchObject({ id: personaId, nickname, role: 'colaborador', status: 'pending', userId: null });
});
