import { test, expect } from '@playwright/test';
import { loginAs, createBaulViaApi, createPersonaViaApi, invitePersonaViaApi, API_BASE_URL } from './helpers';

test('tapping "Invitar" on a persona card issues its invite link and shares it', async ({ page }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Persona invite UI test baúl ${Date.now()}`);
  const nickname = `Abuela ${Date.now()}`;
  const personaId = await createPersonaViaApi(page, accessToken, baulId, nickname);

  await page.goto(`/baules/${baulId}`);
  await page.getByRole('button', { name: 'Menú' }).click();
  await page.getByRole('menuitem', { name: 'Invitar a la familia' }).click();
  await page.waitForURL(`**/baules/${baulId}/invitar`);

  const personaCard = page.getByTestId(`persona-invite-${personaId}`);
  await expect(personaCard.getByText(nickname)).toBeVisible();

  const [inviteResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes(`/api/baules/${baulId}/personas/${personaId}/invite`) && response.request().method() === 'POST'
    ),
    personaCard.getByRole('button', { name: 'Invitar' }).click(),
  ]);
  expect(inviteResponse.status(), 'issuing the invite should succeed').toBe(200);
  const invite = await inviteResponse.json();
  expect(invite.url).toContain('/invitacion/baul/');
  // Whether the "Invitar" click then hands that URL to a native share sheet or falls back to
  // copying it to the clipboard (see sharePublicLink) depends on Web Share API support in
  // whatever browser is running the suite — not asserted here, only that tapping "Invitar"
  // issues the right link in the first place.
});

test('re-tapping "Invitar" on the same still-pending persona re-shares the same token', async ({ page }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Persona invite reshare test baúl ${Date.now()}`);
  const nickname = `Tío Juan ${Date.now()}`;
  const personaId = await createPersonaViaApi(page, accessToken, baulId, nickname);

  const first = await invitePersonaViaApi(page, accessToken, baulId, personaId);
  const second = await invitePersonaViaApi(page, accessToken, baulId, personaId);

  expect(second.token).toBe(first.token);
});

test('invite a pre-provisioned persona → guest joins directly, preserving its identity → rejoining is a no-op', async ({ page, browser }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Persona invite join test baúl ${Date.now()}`);
  const nickname = `Abuela ${Date.now()}`;
  const personaId = await createPersonaViaApi(page, accessToken, baulId, nickname);

  const { token } = await invitePersonaViaApi(page, accessToken, baulId, personaId);

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await loginAs(guestPage, 'Normal User');
  await guestPage.goto(`/invitacion/baul/${token}`);
  // The single CTA always routes through onboarding first — no way to skip it from here. No
  // "¿Quién eres tú?" step either — the token identifies exactly this persona.
  await guestPage.getByRole('button', { name: 'Unirme al Baúl' }).click();
  await guestPage.waitForURL('**/onboarding**', { timeout: 15_000 });
  await guestPage.getByRole('button', { name: 'Saltar' }).click();
  await guestPage.waitForURL((url) => url.pathname === `/baules/${baulId}`, { timeout: 15_000 });

  const personasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(personasResponse.ok(), `failed to list personas: ${personasResponse.status()}`).toBeTruthy();
  const personas = await personasResponse.json();
  const claimed = personas.find((p: { id: string }) => p.id === personaId);
  expect(claimed).toMatchObject({ id: personaId, nickname, role: 'colaborador', status: 'active' });
  expect(claimed.userId, 'accepting should link the guest account to this exact persona').toBeTruthy();

  const colaboradorPersonas = personas.filter((p: { role: string }) => p.role === 'colaborador');
  expect(colaboradorPersonas, 'no extra persona should have been created').toHaveLength(1);

  // Opening the same link again as the same guest must be a no-op, not a duplicate persona.
  await guestPage.goto(`/invitacion/baul/${token}`);
  await guestPage.getByRole('button', { name: 'Unirme al Baúl' }).click();
  await guestPage.waitForURL('**/onboarding**', { timeout: 15_000 });
  await guestPage.getByRole('button', { name: 'Saltar' }).click();
  await guestPage.waitForURL((url) => url.pathname === `/baules/${baulId}`, { timeout: 15_000 });
  await guestContext.close();

  const personasAfterRejoinResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const personasAfterRejoin = await personasAfterRejoinResponse.json();
  const colaboradorPersonasAfterRejoin = personasAfterRejoin.filter((p: { role: string }) => p.role === 'colaborador');
  expect(colaboradorPersonasAfterRejoin, 'rejoining via the same link must not create a duplicate persona').toHaveLength(1);
  expect(colaboradorPersonasAfterRejoin[0].id).toBe(personaId);
});
