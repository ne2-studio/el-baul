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

Neither `chromium-cli` nor `playwright` is installed as a project dependency here.
Find a cached copy before trying to install one (avoids a network fetch):

```bash
find ~/.npm/_npx -maxdepth 3 -type d -name playwright 2>/dev/null
```

If that finds e.g. `~/.npm/_npx/<hash>/node_modules/playwright`, use its parent as
`NODE_PATH`:

```bash
export NODE_PATH="$HOME/.npm/_npx/<hash>/node_modules"
node -e "const {chromium}=require('playwright'); console.log(chromium.executablePath())"
```

If that binary path doesn't exist on disk, or nothing was found at all, fall back to
`npx --yes playwright@latest ...` (needs network) and `npx playwright install
chromium` for the browser binary.

Launch headless in this sandboxed container with `--no-sandbox`:

```js
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await page.locator('button:has-text("Continuar con Google")').first().click();
await page.waitForURL('**/authorize**', { timeout: 15000 });
await page.locator('button:has-text("Admin User")').click();
await page.waitForURL('http://localhost:3000/**', { timeout: 15000 });
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
- **Sentry source-map upload as a build side effect.** `app/vite.config.ts` wires
  `sentryVitePlugin` unconditionally; it reads `SENTRY_AUTH_TOKEN` straight from
  `app/.env.sentry-build-plugin` (unsetting the shell env var does *not* disable it).
  It only fires on `vite build` (i.e. `npm run build`), never on `vite`/`npm run dev`
  — so prefer the dev-server flow above for iteration, and only run `npm run build`
  when you actually need the production bundle (it uploads a real release to Sentry
  every time — benign, but not free, and not yours to trigger casually). Running
  `npm run build` **directly on the host** picks up `.env.sentry-build-plugin` and
  uploads; building via **the Docker image** (`docker compose up --build app`, or CI)
  does not — `app/.dockerignore` excludes all `.env*` files from the build context, so
  `SENTRY_AUTH_TOKEN` is simply absent there, same as it already was in CI.
- **`dotnet-ef` not on `PATH`.** It's installed as a global tool but lives at
  `~/.dotnet/tools/dotnet-ef`, which isn't on `PATH` by default in this environment.
  Before `dotnet ef migrations add ...`: `export PATH="$HOME/.dotnet/tools:$PATH"`.
- **`app/prototype/`** is a separate, throwaway design prototype (its own
  `package.json`/`src`) — it is not the real app and isn't part of this docker-compose
  stack. Don't build/run it when asked to run "the app".
