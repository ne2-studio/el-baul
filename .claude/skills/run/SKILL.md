---
name: run
description: "Launches the full El Baúl stack (docker-compose: Postgres/MinIO/imgproxy/fake-oidc/api + a Vite dev server for the frontend) and gets to an authenticated, interactive screen. Use when asked to run, start, screenshot, or explore the app, or as the setup step before verifying a change end-to-end."
---

## Goal

Get from a cold checkout to a logged-in browser (or a bearer token for raw API calls)
with the least ceremony, without tripping the gotchas below — each one cost real time
discovering it, so read them before you start.

## Step 0 — always first: clean slate

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' | grep el-baul
```

If anything `el-baul-*` is already running, run `docker compose down` from the repo
root **before** doing anything else, even if it looks like what you need. A stale
container serving an old build is the single most expensive failure mode in this repo
— see "Gotcha: the stale `app` container" below. `down` (no `-v`) stops everything but
keeps the `pgdata`/`miniodata` volumes, so seeded test baúles/photos survive.

## 1. Backend + infra (docker compose)

From the repo root:

```bash
docker compose up -d postgres minio imgproxy fake-oidc api
```

Deliberately **not** `app` — see step 2. Migrations apply automatically on API
startup (`Program.cs` calls `dbContext.Database.MigrateAsync()`), no manual
`dotnet ef database update` needed after `up`.

If backend source changed since the image was last built:

```bash
docker compose build api && docker compose up -d api
```

Sanity-check it came up clean:

```bash
docker compose logs api --tail=20
```

## 2. Frontend — run Vite directly, not the `app` container

The `app` compose service builds `dist/` **at image-build time** (a multi-stage
`app/Dockerfile` runs `npm run build` itself, see the root `README.md` /
`docker-compose.yaml` comment) — it will silently keep showing old code after you edit
`app/src` until you rebuild the image. For iterative work, don't start it; run the dev
server instead:

```bash
cd app
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill    # free the port — stale vite or the app container
docker stop el-baul-app-1 2>/dev/null         # in case the compose "app" service is up
npx vite --port 3000 --strictPort > /tmp/vite-dev.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
tail -5 /tmp/vite-dev.log   # confirm it says "Local: http://localhost:3000/"
```

Port **3000**, not the 5173 the frontend `README.md` mentions for plain `npm run dev`
— fake-oidc's registered redirect URI is hardcoded to `http://localhost:3000/callback`
(`docker-compose.yaml`'s `fake-oidc.environment.OIDC_CLIENTS`), so login only works on
3000. `--strictPort` makes Vite fail loudly instead of silently binding 3001 when the
port's taken — always read the actual startup log line before trusting anything you
see in the browser (see the stale-container gotcha).

Only rebuild the real image (`docker compose up -d --build app` from the repo root,
which runs `npm run build` inside the container using the `VITE_*` build args set in
`docker-compose.yaml`) when you specifically need to validate the production Docker
build itself, not for routine iteration — and see the Sentry gotcha first.

## 3. Log in

There's no real login UI — `fake-oidc` (a throwaway OIDC provider, only for
local/E2E) picks the user via a button click:

1. Open `http://localhost:3000` → click **"Continuar con Google"**
2. Redirects to fake-oidc's chooser at `:5000/authorize`
3. Click **"Admin User"** (`admin-user`, custodio of whatever test baúles already
   exist) or **"Normal User"**
4. Redirects back to `localhost:3000/callback`, now authenticated

## 4. Driving it with Playwright

`@playwright/test` is a real devDependency of `app/` (pinned to `1.61.1`, matching the
Chromium build already cached at `~/.cache/ms-playwright` on this machine — `cd app &&
npx playwright install --dry-run chromium` confirms this without downloading anything).
No more hunting for a cached `npx` copy or exporting `NODE_PATH` — just run from `app/`:

```bash
cd app
npx playwright test        # the smoke suite in app/e2e/ — see 4a below
```

For ad hoc one-off scripting (not the smoke suite), `require('playwright')` resolves
straight from `app/node_modules` as long as your cwd is `app/`:

```js
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Continuar con Google' }).click();
await page.waitForURL('**/authorize**', { timeout: 15000 });
await page.getByRole('button', { name: 'Admin User' }).click();
// Don't wait for 'http://localhost:3000/**' here — that glob also matches the
// transient /callback screen ("Preparando tus baúles…") the SPA shows while it's still
// exchanging the code for a token, and resolves before the token actually lands in
// localStorage. Wait for the settled route instead:
await page.waitForURL((url) => url.pathname === '/baules' || url.pathname === '/empty', { timeout: 15000 });
```

## 4a. The `app/e2e/` smoke suite

`app/e2e/smoke.spec.ts` is a minimal Playwright Test smoke suite that boots the whole
docker-compose stack itself — no need to run steps 1-3 above first. `app/e2e/global-setup.ts`
does the clean-slate check, `docker compose up --build -d` (always rebuilds from current
source, never trusts a stale image — see the gotcha below), and polls `/health` and
`:3000` until ready; `app/e2e/global-teardown.ts` runs `docker compose down` (no `-v`)
afterwards. The test logs in as Admin User through fake-oidc, seeds one baúl with a
`Date.now()`-suffixed unique name via a direct `POST /api/baules` call (a fresh Admin User
has zero baúles, which routes to a completely different empty-state screen — see
`loadUserData` in `app/src/app/App.tsx` — and a fixed name would eventually collide with a
leftover from a prior local run and break Playwright's strict-mode locator with a
"resolved to 2 elements" error), and asserts it lands on the real home screen
(`app/src/app/components/BaulesList.tsx`).

```bash
cd app && npm run test:e2e
```

Because teardown keeps the volumes, repeated local runs accumulate one seeded baúl each
— harmless since each has a unique name. Also wired into CI, but only as a nightly job
(`.github/workflows/e2e-nightly.yml`, cron + `workflow_dispatch`) — it always builds
api/app/imgproxy fresh regardless of what changed, deliberately decoupled from the
per-app `backend-deploy.yml`/`frontend-deploy.yml`/`imgproxy-deploy.yml`/
`storybook-deploy.yml` pipelines so a slow e2e run never blocks or delays a deploy.

## 4b. The `app/e2e-image-acceptance/` suite

Same idea as 4a, but against a much lighter stack: the frontend image + `el-baul-api-lite`
(everything in memory — no Postgres/MinIO/imgproxy, see `api/README.md`'s "el-baul-api-lite"
section) instead of the full `docker-compose.yaml`. This is the suite to reach for while
working on **photo upload/move/delete, persona invite/role-change/revoke, or
removal-request submit/approve/reject** — real regression coverage for exactly those flows,
noticeably faster than 4a (~30s combined vs. ~1.5min), and it's what gates
`frontend-deploy.yml` (build → this suite → push/deploy).

```bash
docker build -t el-baul-app:local app/
docker build -f api/ElBaul.Api.Lite/Dockerfile -t el-baul-api-lite:local api/
cd app
APP_IMAGE=el-baul-app:local API_LITE_IMAGE=el-baul-api-lite:local npm run test:image-acceptance
```

Own compose file (`docker-compose.lite.yml`), own `global-setup.ts`/`global-teardown.ts`, own
`helpers.ts` — deliberately not sharing anything with 4a's `app/e2e/`, so a change to one
can't silently affect the other. `personas.spec.ts` and `removal-requests.spec.ts` each log
into a **second** `browser.newContext()` as fake-oidc's second seeded user ("Normal User",
`login_hint=user`) — the backend won't let the same account both invite and accept its own
invite, and only shows "submit removal request" to a non-admin member, never the baúl's own
custodian.

To rebuild after a source change (same idea as step 1's `docker compose build api`):
```bash
docker build -t el-baul-app:local app/                                    # frontend changed
docker build -f api/ElBaul.Api.Lite/Dockerfile -t el-baul-api-lite:local api/  # lite backend changed
```

## 5. Extracting the access token (for raw API probing)

Useful to check what the backend is *actually* returning, independent of any
frontend rendering — see the "verify" skill for why that distinction matters here.
`react-oidc-context` stores the token in `localStorage`:

```js
const storage = await page.evaluate(() => {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    out[k] = localStorage.getItem(k);
  }
  return out;
});
const user = JSON.parse(storage['oidc.user:http://localhost:5000:el-baul-app']);
console.log(user.access_token);
```

Then: `curl -s "http://localhost:5050/api/..." -H "Authorization: Bearer $TOKEN"`.

## 6. One-off maintenance commands

Documented per-command in `api/README.md`. General shape:

```bash
docker compose exec api dotnet ElBaul.Api.dll <command-name> --dry-run
docker compose exec api dotnet ElBaul.Api.dll <command-name>
```

## Tear down

```bash
docker compose down                          # keeps pgdata/miniodata volumes
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill    # kill the vite dev server if you started one
```

## Gotchas

- **Stale `app` container serving old code on :3000.** The single most expensive
  failure mode found in this repo — see the "verify" skill's write-up. Always confirm
  what's actually bound to 3000 (`docker ps`) before trusting what you see there.
- **Sentry sourcemap upload is a separate, explicit step — not a build side effect.**
  `npm run build` (`vite build && sentry-cli sourcemaps inject dist`) never talks to
  Sentry: `sourcemaps inject` only stamps deterministic debug ids into the already-built
  `dist/` files/maps, purely locally, no `SENTRY_AUTH_TOKEN` needed. The actual upload
  lives in its own script, `npm run sentry:upload-sourcemaps`, which is **not** run by
  `npm run build` or `npm run dev` and needs `SENTRY_AUTH_TOKEN` in the environment (see
  `app/.env.sentry-build-plugin`, gitignored) — don't run it casually, it's meant to be
  triggered by CI (`frontend-deploy.yml`) against the `dist/` actually shipped in the
  image, not a local rebuild. **Injected debug ids are not portable across
  environments** — the same source, rebuilt independently on the host vs. inside the
  `node:22-alpine` Docker image, produces *different* debug ids (observed directly:
  same output filename/content-hash, different `debugId=` comment). That's why the CI
  step extracts `dist/` straight out of the already-built, already-tagged image
  (`docker create` + `docker cp <container>:/usr/share/nginx/html ./dist`) instead of
  re-running `npm run build` on the runner — a second independent build would upload
  sourcemaps that don't match what's actually deployed.
- **`dotnet-ef` not on `PATH`.** It's installed as a global tool but lives at
  `~/.dotnet/tools/dotnet-ef`, which isn't on `PATH` by default in this environment.
  Before `dotnet ef migrations add ...`: `export PATH="$HOME/.dotnet/tools:$PATH"`.
- **`app/prototype/`** is a separate, throwaway design prototype (its own
  `package.json`/`src`) — it is not the real app and isn't part of this docker-compose
  stack. Don't build/run it when asked to run "the app".
