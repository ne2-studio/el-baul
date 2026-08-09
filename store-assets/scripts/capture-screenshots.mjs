// Generates Google Play store listing screenshots by driving the real app (Vite dev server,
// see `./scripts/run-env frontend-dev`) with Playwright, logging in for real against fake-oidc,
// then serving realistic fixture data for every other API call (see fixtures.mjs +
// install-routes.mjs) — api-lite's chat backend always answers "Respuesta de prueba" and there's
// no seeding endpoint for rich content, so faking the HTTP layer is the only way to get
// realistic-looking screens without a live OpenAI-backed environment.
//
// Prereqs: `./scripts/run-env frontend-dev` running, and the photo fixture server
// (serve-photos.mjs) running on PHOTO_PORT.
//
// Usage: node store-assets/scripts/capture-screenshots.mjs
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFixtures } from './fixtures.mjs';
import { installFixtureRoutes } from './install-routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../screenshots');

const APP_URL = 'http://localhost:5173';
const API_ORIGIN = 'http://localhost:5051';
const PHOTO_PORT = 4545;
const PHOTO_BASE = `http://localhost:${PHOTO_PORT}`;

// 9:16 exactly, deviceScaleFactor 2 for crisp output — see the conversation for why these
// three were chosen (within Google Play's stated pixel-side bounds for phone/7"/10" tablet).
const TARGETS = [
  { key: 'phone', width: 540, height: 960, dsf: 2 },     // -> 1080x1920
  { key: 'tablet7', width: 675, height: 1200, dsf: 2 },  // -> 1350x2400
  { key: 'tablet10', width: 900, height: 1600, dsf: 2 }, // -> 1800x3200
];

async function loginViaFakeOidc(page) {
  await page.goto(APP_URL + '/');
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await page.waitForURL('**/authorize**', { timeout: 15000 });
  await page.getByRole('button', { name: 'Admin User' }).click();
  await page.waitForURL((url) => url.origin === APP_URL.replace(/:\d+$/, ':5173') || url.href.startsWith(APP_URL), { timeout: 15000 }).catch(() => {});
  // Give the SPA a moment to finish the token exchange and land somewhere inside the app.
  await page.waitForTimeout(1500);
}

async function shootScreen(context, fixtures, { name, path: routePath, waitFor, beforeShot }) {
  for (const target of TARGETS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: target.width, height: target.height });
    await installFixtureRoutes(page, fixtures, API_ORIGIN);
    await page.goto(APP_URL + routePath, { waitUntil: 'domcontentloaded' });
    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 15000 }).catch((e) => console.log(`  [warn] ${name}/${target.key}: selector "${waitFor}" not found (${e.message.split('\n')[0]})`));
    } else {
      await page.waitForTimeout(1200);
    }
    if (beforeShot) await beforeShot(page).catch((e) => console.log(`  [warn] ${name}/${target.key}: beforeShot failed (${e.message})`));
    await page.waitForTimeout(1000); // let fonts/images/motion settle
    const dir = path.join(OUT_DIR, target.key);
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${name}.png`);
    await page.screenshot({ path: file });
    console.log(`  saved ${target.key}/${name}.png (${target.width * target.dsf}x${target.height * target.dsf})`);
    await page.close();
  }
}

async function run() {
  const fixtures = buildFixtures(PHOTO_BASE);
  const { baulId, chapterByKey, data } = fixtures;

  const browser = await chromium.launch();

  // Separate, never-authenticated context: the shared context below carries a real fake-oidc
  // session in localStorage for the rest of the screens, and PublicRoute silently redirects an
  // authenticated visit to "/" straight to /baules — so the welcome screen must be shot before
  // (and from a different context than) that login happens.
  console.log('01-login (logged out)');
  const loggedOutContext = await browser.newContext({ deviceScaleFactor: 2 });
  await shootScreen(loggedOutContext, fixtures, { name: '01-login', path: '/', waitFor: 'text=Continuar con Google' });
  await loggedOutContext.close();

  // deviceScaleFactor is set per-context since it can't change per-page; group targets by dsf
  // instead — all three targets here share dsf:2, so one context covers them all.
  const context = await browser.newContext({ deviceScaleFactor: 2 });

  console.log('Logging in via fake-oidc...');
  const loginPage = await context.newPage();
  await installFixtureRoutes(loginPage, fixtures, API_ORIGIN);
  await loginViaFakeOidc(loginPage);
  await loginPage.close();

  const screens = [
    { name: '02-onboarding', path: '/onboarding', waitFor: 'text=Continuar' },
    { name: '03-historia-feed', path: `/baules/${baulId}`, waitFor: 'text=Historia' },
    {
      name: '04-capitulos', path: `/baules/${baulId}`, waitFor: 'text=Capítulos',
      beforeShot: async (page) => { await page.getByRole('button', { name: /Capítulos/ }).click(); await page.waitForTimeout(600); },
    },
    { name: '05-capitulo-abuelos', path: `/baules/${baulId}/capitulos/${chapterByKey.abuelos.id}`, waitFor: 'text=Los abuelos' },
    { name: '06-capitulo-playa', path: `/baules/${baulId}/capitulos/${chapterByKey.playa.id}`, waitFor: 'text=Verano en la playa' },
    {
      name: '07-visor-foto',
      path: `/baules/${baulId}/capitulos/${chapterByKey.abuelos.id}/foto/${fixtures.photosByChapter[chapterByKey.abuelos.id][0].id}`,
      waitFor: 'img',
    },
    {
      name: '08-familia', path: `/baules/${baulId}`, waitFor: 'text=Familia',
      beforeShot: async (page) => { await page.getByRole('button', { name: /Familia/ }).click(); await page.waitForTimeout(600); },
    },
    { name: '09-persona-abuela', path: `/baules/${baulId}/personas/${fixtures.personas.carmen.id}`, waitFor: 'text=Carmen Ruiz' },
    { name: '10-chat-ia', path: `/baules/${baulId}/recordar`, waitFor: 'text=Recordemos' },
    { name: '11-invitacion', path: `/invitacion/baul/${data.inviteLink.token}`, waitFor: 'text=Familia García' },
  ];

  for (const screen of screens) {
    console.log(`\n${screen.name}`);
    await shootScreen(context, fixtures, screen);
  }

  await browser.close();
  console.log(`\nDone. Screenshots in ${OUT_DIR}`);
}

run();
