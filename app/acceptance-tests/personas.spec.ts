import { test, expect } from '@playwright/test';
import { loginAs, createBaulViaApi, API_BASE_URL } from './helpers';

// Needs two identities: PersonaDetailScreen's role <select> only renders once a persona is
// no longer pending, and a persona can only leave "pending" by a *different* account accepting
// the invite — the backend rejects self-accept (the inviting/custodian account already has a
// Persona row in that baúl). See AcceptPersonalInviteAsync.
test('create persona → accept invite → change role → revoke access → allow invite again', async ({ page, browser }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Personas test baúl ${Date.now()}`);
  await page.goto(`/baules/${baulId}`);

  await page.getByRole('button', { name: /Personas/ }).click();
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

  // Second identity, second browser context: accept the invite as a different account.
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await loginAs(guestPage, 'Normal User');
  await guestPage.goto(`/invitacion/persona/${personaId}`);
  await guestPage.getByRole('button', { name: 'Unirme al Baúl' }).click();
  await guestPage.waitForURL((url) => /\/baules\/[^/]+$/.test(url.pathname), { timeout: 15_000 });
  await guestContext.close();

  // Back as Admin: the persona is no longer pending, so "Gestionar acceso" is now offered
  // in the options menu — the role <select> lives inside that modal, not on the page itself.
  await page.goto(`/baules/${baulId}/personas/${personaId}`);
  await page.getByRole('button', { name: 'Opciones de la persona' }).click();
  await page.getByRole('menuitem', { name: 'Gestionar acceso' }).click();
  await page.getByRole('combobox').selectOption('administrador');
  await page.getByRole('button', { name: 'Cerrar' }).click();

  await page.getByRole('button', { name: 'Opciones de la persona' }).click();
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
  await expect(page.getByRole('menuitem', { name: 'Compartir invitación' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Gestionar acceso' })).toBeHidden();

  const restoredPersonasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(restoredPersonasResponse.ok(), `failed to list restored personas: ${restoredPersonasResponse.status()}`).toBeTruthy();
  const restoredPersonas = await restoredPersonasResponse.json();
  const restoredPersona = restoredPersonas.find((p: { id: string }) => p.id === personaId);
  expect(restoredPersona).toMatchObject({ id: personaId, nickname, role: 'colaborador', status: 'pending', userId: null });
});
