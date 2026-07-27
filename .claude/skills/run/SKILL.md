---
name: run
description: "Launches the full El Baúl stack (docker-compose: Postgres/MinIO/imgproxy/fake-oidc/api + a Vite dev server for the frontend) and gets to an authenticated, interactive screen. Use when asked to run, start, screenshot, or explore the app, or as the setup step before verifying a change end-to-end."
---

## Goal

Get from a cold checkout to a logged-in browser (or a bearer token for raw API calls)
with the least ceremony. The canonical interactive frontend for local code changes is
Vite on `http://localhost:5173`; the Docker `app` service is the precompiled image on
`http://localhost:3000` and is reserved for Docker/E2E validation. For live frontend
verification, return `http://localhost:5173` and do not start an additional frontend
server manually.

## Port Contract

- `http://localhost:5173` — Vite dev server, hot reload, current `app/` source.
- `http://localhost:3000` — Docker `app` service, precompiled `dist/`, used by E2E.
- `http://localhost:4173` — Vite preview of a local production build.
- If `5173` is occupied, frontend startup fails explicitly.

## 1. Backend + infra (docker compose)

From the repo root:

```bash
docker compose up --build -d postgres minio imgproxy fake-oidc mailpit api
```

Deliberately **not** `app` — `app` would serve the precompiled Docker frontend on
`:3000`, while local interactive frontend work uses Vite on `:5173`. Migrations apply
automatically on API startup (`Program.cs` calls `dbContext.Database.MigrateAsync()`),
no manual `dotnet ef database update` needed after `up`.

Sanity-check it came up clean:

```bash
docker compose logs api --tail=20
```

## 2. Frontend — Vite dev server

Run the dev server directly from `app/`. The npm script pins the callback to `5173`
even if a local ignored `.env` still has older values:

```bash
cd app
npm run dev > /tmp/el-baul-vite-dev.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'
tail -10 /tmp/el-baul-vite-dev.log
```

Return `http://localhost:5173` as the live frontend URL.

If `5173` is already occupied, Vite exits with an error. Do not switch to another port
for local verification; free the known service or stop that terminal session.

Only rebuild the real image (`docker compose up -d --build app` from the repo root,
which runs `npm run build` inside the container and serves the resulting `dist/` from
nginx on `http://localhost:3000`) when you specifically need to validate the production
Docker build itself, not for routine iteration.

## 3. Log in

There's no real login UI — `fake-oidc` (a throwaway OIDC provider, only for
local/E2E) picks the user via a button click:

1. Open `http://localhost:5173` → click **"Continuar con Google"**
2. Redirects to fake-oidc's chooser at `:5000/authorize`
3. Click **"Admin User"** (`admin-user`, custodio of whatever test baúles already
   exist) or **"Normal User"**
4. Redirects back to `localhost:5173/callback`, now authenticated

## 4. Driving it with Playwright

Two independent Playwright setups in this repo, each its own `@playwright/test` devDependency
pinned to `1.61.1` (matching the Chromium build already cached at `~/.cache/ms-playwright` on
this machine — `npx playwright install --dry-run chromium` from either `app/` or
`e2e-tests/` confirms this without downloading anything): `app/`'s own, used by its `e2e/`
suite (4b), and `/e2e-tests/`'s, a separate root-level package for the full-stack smoke suite
(4a) since it exercises the whole repo (api + app + imgproxy), not just the frontend.

For ad hoc one-off scripting against a stack you started yourself (steps 1-3 above, not
either suite's own `globalSetup`), `require('playwright')` resolves straight from
`app/node_modules` as long as your cwd is `app/`:

```js
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Continuar con Google' }).click();
await page.waitForURL('**/authorize**', { timeout: 15000 });
await page.getByRole('button', { name: 'Admin User' }).click();
// Don't wait for 'http://localhost:5173/**' here — that glob also matches the
// transient /callback screen ("Preparando tus baúles…") the SPA shows while it's still
// exchanging the code for a token, and resolves before the token actually lands in
// localStorage. Wait for the settled route instead:
await page.waitForURL((url) => url.pathname === '/baules' || url.pathname === '/empty', { timeout: 15000 });
```

## 4a. The `/e2e-tests/` smoke suite

`e2e-tests/smoke.spec.ts` is a minimal Playwright Test smoke suite, at the repo root as its
own package (`cd e2e-tests && npm install` the first time) because it exercises the whole
stack — api + app + imgproxy — not just the frontend, and boots the whole docker-compose
stack itself, no need to run steps 1-3 above first. `e2e-tests/global-setup.ts` does the
clean-slate check, `docker compose up --build -d`, and polls `/health` and `:3000` until
the Docker frontend image is ready; `e2e-tests/global-teardown.ts` runs `docker compose down` (no `-v`) afterwards. The
test logs in as Admin User through fake-oidc, seeds one baúl with a `Date.now()`-suffixed
unique name via a direct `POST /api/baules` call (a fresh Admin User has zero baúles, which
routes to a completely different empty-state screen — see `loadUserData` in
`app/src/app/App.tsx` — and a fixed name would eventually collide with a leftover from a
prior local run and break Playwright's strict-mode locator with a "resolved to 2 elements"
error), and asserts it lands on the real home screen
(`app/src/features/baules/components/BaulesList.tsx`).

```bash
cd e2e-tests && npm run test:e2e
```

Because teardown keeps the volumes, repeated local runs accumulate one seeded baúl each
— harmless since each has a unique name. Also wired into CI, but only as a nightly job
(`.github/workflows/e2e-nightly.yml`, cron + `workflow_dispatch`) — it always builds
api/app/imgproxy fresh regardless of what changed, deliberately decoupled from the
per-app `backend-deploy.yml`/`frontend-deploy.yml`/`imgproxy-deploy.yml`/
`storybook-deploy.yml` pipelines so a slow e2e run never blocks or delays a deploy.

## 4b. The `app/e2e/` suite

Same idea as 4a, but against a much lighter stack: the frontend image + `el-baul-api-lite`
(everything in memory — no Postgres/MinIO/imgproxy, see `docs/operations/api-lite.md`)
instead of the full `docker-compose.yaml`. This is the suite to reach for while
working on **photo upload/move/delete, persona invite/role-change/revoke, or
removal-request submit/approve/reject** — real regression coverage for exactly those flows,
noticeably faster than 4a (~30s combined vs. ~1.5min), and it's what gates
`frontend-deploy.yml` (build → this suite → push/deploy).

```bash
docker build -t el-baul-app:local app/
docker build -f api/ElBaul.Api.Lite/Dockerfile -t el-baul-api-lite:local api/
cd app
APP_IMAGE=el-baul-app:local API_LITE_IMAGE=el-baul-api-lite:local npm run test:e2e
```

Own compose file (`docker-compose.lite.yml`), own `global-setup.ts`/`global-teardown.ts`, own
`helpers.ts` — deliberately not sharing anything with 4a's `/e2e-tests/`, so a change to one
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
frontend rendering.
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

Documented per-command in `docs/operations/maintenance-commands.md`. General shape:

```bash
docker compose exec api dotnet ElBaul.Maintenance.dll <command-name> --dry-run
docker compose exec api dotnet ElBaul.Maintenance.dll <command-name>
```

## Tear down

```bash
docker compose down                          # keeps pgdata/miniodata volumes
# Stop the Vite terminal/background job you started for :5173.
```

## Gotchas

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
