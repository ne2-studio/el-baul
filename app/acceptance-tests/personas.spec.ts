import { test, expect } from '@playwright/test';
import { loginAs, createBaulViaApi, invitePersonaViaApi, API_BASE_URL } from './helpers';

test('create persona → invite → guest joins directly (no "¿quién eres tú?" step)', async ({ page, browser }) => {
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

  // "Invitar a la familia" is now a full page listing every persona, each with its own
  // "Invitar" CTA — the pending persona created above shows up there.
  await page.goto(`/baules/${baulId}/invitar`);
  const personaCard = page.getByTestId(`persona-invite-${personaId}`);
  await expect(personaCard.getByText(nickname)).toBeVisible();
  await expect(personaCard.getByRole('button', { name: 'Invitar' })).toBeVisible();

  const { token } = await invitePersonaViaApi(page, accessToken, baulId, personaId);

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await loginAs(guestPage, 'Normal User');
  await guestPage.goto(`/invitacion/baul/${token}`);
  // The single CTA always routes through onboarding first — no way to skip it from here.
  await guestPage.getByRole('button', { name: 'Unirme al Baúl' }).click();
  await guestPage.waitForURL('**/onboarding**', { timeout: 15_000 });
  await guestPage.getByRole('button', { name: 'Saltar' }).click();
  // Directly lands in the baúl — no "¿Quién eres tú?" step, unlike the old global invite link:
  // the token identifies exactly this persona.
  await guestPage.waitForURL((url) => url.pathname === `/baules/${baulId}`, { timeout: 15_000 });
  await guestContext.close();

  const joinedPersonasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(joinedPersonasResponse.ok()).toBeTruthy();
  const joinedPersonas = await joinedPersonasResponse.json();
  const joined = joinedPersonas.find((p: { id: string }) => p.id === personaId);
  expect(joined).toMatchObject({ id: personaId, nickname, role: 'colaborador', status: 'active' });
  expect(joined.userId, 'accepting should link the guest account to this exact persona').toBeTruthy();

  // Back on "Invitar a la familia", the now-active persona shows a disabled "Ya está dentro".
  await page.goto(`/baules/${baulId}/invitar`);
  const activeCard = page.getByTestId(`persona-invite-${personaId}`);
  await expect(activeCard.getByRole('button', { name: 'Ya está dentro' })).toBeDisabled();
});

test('revoke access on an active persona → its old invite link stops working → re-invite issues a fresh one', async ({ page, browser }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Personas revoke test baúl ${Date.now()}`);
  await page.goto(`/baules/${baulId}`);
  await page.getByRole('button', { name: /Familia/ }).click();
  await page.getByRole('button', { name: 'Nueva persona' }).click();
  const nickname = `Persona ${Date.now()}`;
  await page.getByPlaceholder('Ej. Abuela, Tío Juan…').fill(nickname);
  await page.getByRole('button', { name: 'Añadir' }).click();
  await expect(page.getByPlaceholder('Ej. Abuela, Tío Juan…')).toBeHidden({ timeout: 10_000 });

  const personasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const personas = await personasResponse.json();
  const personaId = personas.find((p: { nickname: string }) => p.nickname === nickname).id as string;

  const firstInvite = await invitePersonaViaApi(page, accessToken, baulId, personaId);

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await loginAs(guestPage, 'Normal User');
  await guestPage.goto(`/invitacion/baul/${firstInvite.token}`);
  await guestPage.getByRole('button', { name: 'Unirme al Baúl' }).click();
  await guestPage.waitForURL('**/onboarding**', { timeout: 15_000 });
  await guestPage.getByRole('button', { name: 'Saltar' }).click();
  await guestPage.waitForURL((url) => url.pathname === `/baules/${baulId}`, { timeout: 15_000 });
  await guestContext.close();

  // The persona is already active (not pending), so "Gestionar permisos" is offered in the
  // options menu — the role <select> lives inside that modal.
  await page.goto(`/baules/${baulId}/personas/${personaId}`);
  await page.getByRole('button', { name: 'Opciones de la persona' }).click();
  await page.getByRole('menuitem', { name: 'Gestionar permisos' }).click();
  await page.getByRole('combobox').selectOption('administrador');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await page.getByRole('button', { name: 'Opciones de la persona' }).click();
  await page.getByRole('menuitem', { name: 'Revocar acceso' }).click();
  await page.getByRole('button', { name: 'Revocar acceso' }).click();
  // Without this wait, the API assertion right below can race the DELETE request the click
  // just fired — the confirm modal only closes once revokeAccess has actually resolved
  // (see PersonaSettingsMenuContainer.handleConfirmRevoke).
  await expect(page.getByText('¿Revocar el acceso?')).toBeHidden({ timeout: 10_000 });

  const revokedResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const revokedPersonas = await revokedResponse.json();
  const revoked = revokedPersonas.find((p: { id: string }) => p.id === personaId);
  // No more sin_acceso — role stays as whatever it was (administrador, set above), only the
  // account link (and its invite token) are cleared, so the row falls back to Pending.
  expect(revoked).toMatchObject({ id: personaId, nickname, role: 'administrador', status: 'pending', userId: null });

  // The old link is dead — the preview endpoint 404s, same as an unknown token.
  const oldPreviewResponse = await page.request.get(`${API_BASE_URL}/api/persona-invites/${firstInvite.token}/preview`);
  expect(oldPreviewResponse.status()).toBe(404);

  // Re-inviting the same, now-Pending persona issues a brand new token.
  const secondInvite = await invitePersonaViaApi(page, accessToken, baulId, personaId);
  expect(secondInvite.token).not.toBe(firstInvite.token);

  const previewResponse = await page.request.get(`${API_BASE_URL}/api/persona-invites/${secondInvite.token}/preview`);
  expect(previewResponse.ok()).toBeTruthy();
});
