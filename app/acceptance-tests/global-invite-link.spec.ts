import { test, expect } from '@playwright/test';
import { loginAs, createBaulViaApi, API_BASE_URL } from './helpers';

test('invite family via global link → guest auto-joins with an auto-created persona → rejoining is a no-op', async ({ page, browser }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Global invite test baúl ${Date.now()}`);
  await page.goto(`/baules/${baulId}`);

  await page.getByRole('button', { name: 'Opciones del baúl' }).click();
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

  const personasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(personasResponse.ok(), `failed to list personas: ${personasResponse.status()}`).toBeTruthy();
  const personas = await personasResponse.json();
  const guestPersonas = personas.filter((p: { role: string }) => p.role === 'colaborador');
  expect(guestPersonas, 'expected exactly one auto-created colaborador persona for the guest').toHaveLength(1);
  expect(guestPersonas[0]).toMatchObject({ role: 'colaborador', status: 'active' });
  expect(guestPersonas[0].userId, 'auto-created persona should be immediately claimed, not pending').toBeTruthy();
  expect(guestPersonas[0].nickname, 'auto-created persona should get a nickname from the account').toBeTruthy();

  // Opening the same link again as the same guest must be a no-op, not a duplicate persona.
  await guestPage.goto(`/invitacion/baul/${token}`);
  await guestPage.getByRole('button', { name: 'Unirme al Baúl' }).click();
  await guestPage.waitForURL((url) => url.pathname === `/baules/${baulId}`, { timeout: 15_000 });
  await guestContext.close();

  const personasAfterRejoinResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(personasAfterRejoinResponse.ok()).toBeTruthy();
  const personasAfterRejoin = await personasAfterRejoinResponse.json();
  const guestPersonasAfterRejoin = personasAfterRejoin.filter((p: { role: string }) => p.role === 'colaborador');
  expect(guestPersonasAfterRejoin, 'rejoining via the same link must not create a duplicate persona').toHaveLength(1);
  expect(guestPersonasAfterRejoin[0].id).toBe(guestPersonas[0].id);

  // Regenerating invalidates the previous token. The trigger button and the confirmation's
  // confirm button share the same accessible name ("Regenerar enlace") in two different
  // views, so wait for the confirmation sheet before the second click — otherwise a slow
  // re-render could let the second click land on the still-visible trigger again instead of
  // actually confirming, silently no-oping the regenerate.
  await page.getByRole('button', { name: 'Opciones del baúl' }).click();
  await page.getByRole('menuitem', { name: 'Invitar a la familia' }).click();
  await page.getByRole('button', { name: 'Regenerar enlace' }).click();
  await expect(page.getByText('¿Regenerar el enlace?')).toBeVisible();

  const [regenerateResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/invite-link/regenerate') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Regenerar enlace' }).click(),
  ]);
  expect(regenerateResponse.status(), 'regenerate request should succeed').toBe(200);

  await expect(page.getByText(linkText)).toBeHidden();
  const newLinkLocator = page.getByText(/\/invitacion\/baul\//);
  await expect(newLinkLocator).toBeVisible();
  const newLinkText = (await newLinkLocator.textContent())!;
  expect(newLinkText, 'regenerating should produce a different token').not.toBe(linkText);

  const oldPreviewResponse = await page.request.get(`${API_BASE_URL}/api/baul-invites/${token}/preview`);
  expect(oldPreviewResponse.status()).toBe(404);
});

test('invite family via global link → guest takes the "ver más" onboarding detour before joining → still lands in the baúl', async ({ page, browser }) => {
  const accessToken = await loginAs(page, 'Admin User');
  const baulId = await createBaulViaApi(page, accessToken, `Global invite onboarding test baúl ${Date.now()}`);
  await page.goto(`/baules/${baulId}`);

  await page.getByRole('button', { name: 'Opciones del baúl' }).click();
  await page.getByRole('menuitem', { name: 'Invitar a la familia' }).click();
  const linkLocator = page.getByText(/\/invitacion\/baul\//);
  await expect(linkLocator).toBeVisible();
  const linkText = (await linkLocator.textContent())!;
  const token = linkText.match(/\/invitacion\/baul\/([^\s"']+)/)?.[1];
  expect(token, `expected to find an invite token in "${linkText}"`).toBeTruthy();
  await page.getByRole('button', { name: 'Cerrar' }).click();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await loginAs(guestPage, 'Normal User');
  await guestPage.goto(`/invitacion/baul/${token}`);

  // The "ver más" detour used to end in a blank screen: OnboardingRoute redirected to
  // /invitacion/{baulId}/aceptar on completion, a route that doesn't exist (accepting needs
  // the token/personaId, not a bare baúl id) — see OnboardingRoute.tsx's redirectTo fix.
  await guestPage.getByRole('button', { name: 'Ver de qué va esto' }).click();
  await guestPage.waitForURL('**/onboarding**', { timeout: 15_000 });
  await guestPage.getByRole('button', { name: 'Saltar' }).click();
  await guestPage.waitForURL((url) => url.pathname === `/baules/${baulId}`, { timeout: 15_000 });

  const personasResponse = await page.request.get(`${API_BASE_URL}/api/baules/${baulId}/personas`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(personasResponse.ok(), `failed to list personas: ${personasResponse.status()}`).toBeTruthy();
  const personas = await personasResponse.json();
  const guestPersonas = personas.filter((p: { role: string }) => p.role === 'colaborador');
  expect(guestPersonas, 'expected the guest to still auto-join after the onboarding detour').toHaveLength(1);

  await guestContext.close();
});
