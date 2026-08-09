# Google Play store listing assets

Fixtures and scripts to (re)generate the Android app's Google Play store listing screenshots
and featured graphic from the real running app — not hand-mocked images. Nothing here is
bundled into any app build (`app/`, `admin/`, `api/` each build with their own directory as
Docker context; see the root `.gitignore`/`.dockerignore`).

- `fixtures/photos/` — ~30 royalty-free family/emotion-themed photos (Wikimedia Commons,
  public-domain or permissive CC license — see `fixtures/ATTRIBUTIONS.md`). None depict this
  family; they exist purely to make the fixture data below look like a real, lived-in baúl.
  Committed to the repo (small, useful to keep around for the next regeneration).
- `scripts/fixtures.mjs` — realistic Spanish-language fixture data (a baúl, 6 chapters, a
  mixed feed, personas, a chat conversation, an invite preview) matching the API's DTO shapes.
- `scripts/install-routes.mjs` — wires that data into a Playwright page via network
  interception (`page.route`), instead of seeding a real backend — api-lite's fake AI chat
  backend only ever answers "Respuesta de prueba" and there's no seeding endpoint for rich
  content, so faking the HTTP layer was the only way to get realistic-looking screens.
- `scripts/capture-screenshots.mjs` — drives the real app with Playwright (real fake-oidc
  login, fixture data for everything else) and screenshots 11 screens at phone (1080x1920),
  7" tablet (1350x2400) and 10" tablet (1800x3200) — all exact 9:16, within Google's stated
  pixel-side bounds. Output: `screenshots/<device>/NN-name.png` (gitignored — regenerate
  instead of committing).
- `scripts/render-featured-graphic.mjs` + `featured-graphic/source.html` — renders the
  1024x500 featured graphic (app icon + brand colors + a cover photo) via Playwright.
  Output gitignored, same reasoning.

## Regenerating

```bash
# 1. One-time / when you want a different photo bank:
node store-assets/scripts/fetch-photos.mjs      # needs Playwright's node_modules — see below
node store-assets/scripts/resize-photos.mjs

# 2. Start the app (Vite + api-lite + fake-oidc):
./scripts/run-env frontend-dev

# 3. Serve the fixture photos (separate terminal, or background it):
node store-assets/scripts/serve-photos.mjs

# 4. Capture:
node store-assets/scripts/capture-screenshots.mjs
node store-assets/scripts/render-featured-graphic.mjs
```

All scripts are plain Node ESM using the `playwright` package already installed under
`app/node_modules` — since they don't live under `app/`, Node's module resolution won't find
it automatically. Either run them with a temporary symlink...

```bash
ln -s ../../app/node_modules store-assets/scripts/node_modules   # remove when done
```

...or copy the script into `app/` and run it from there.

## Google Play upload limits (as of writing)

Play allows **at most 8** screenshots per device class, but this pipeline generates 11 (more
coverage/choice than you need). Recommended picks if you want exactly 8, in upload order:

`01-login`, `03-historia-feed`, `04-capitulos`, `05-capitulo-abuelos`, `10-chat-ia`,
`08-familia`, `09-persona-abuela`, `02-onboarding`

— leaving out `06-capitulo-playa` (redundant with `05`), `07-visor-foto` and `11-invitacion`
(least essential for a first impression). Swap freely; it's a matter of taste.

Featured graphic: 1024x500 exactly, PNG, well under the 15 MB cap.
