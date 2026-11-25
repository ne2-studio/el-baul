# Deployment (CI/CD)

- **Per-service workflows**: six independent, path-filtered GitHub Actions workflows —
  `backend-cicd.yml` (`api/**`), `frontend-cicd.yml` (`app/**`), `admin-cicd.yml` (`admin/**`),
  `imgproxy-cicd.yml` (`imgproxy/**`), `storybook-cicd.yml` (`app/**`, `storybook/**`),
  `web-cicd.yml` (`web/**`, Hugo marketing/help site). Each has two stages:
  - `build` (build/test): runs on every push to any branch and every PR touching its paths, with
    read-only permissions. For backend/imgproxy/app/admin it includes building and scanning the
    Docker image, which is only loaded locally — never pushed. Runs superseded on non-`main` refs
    are cancelled.
  - `deploy`, after `build` passes. Runs on `main` are never cancelled mid-flight.
    - Backend and imgproxy (Coolify): only on pushes to `main`. Builds the image again (layers
      reused via the GHA cache), pushes it to GHCR as `:latest`/`:sha-<sha>`, then triggers the
      Coolify deploy webhook (`scripts/deploy`).
    - Frontends (Cloudflare Pages): `app/` → `el-baul-app`, `admin/` → `el-baul-admin`, `web/` →
      `el-baul-web`, Storybook → `el-baul-storybook`. Builds the static output with Node/Hugo
      directly (no image) and runs `wrangler pages deploy`: pushes to `main` publish production,
      same-repo PRs publish a preview at `<branch>.<project>.pages.dev` and get a PR comment with
      its URL. For `app/`/`admin/` the job runs in the `frontend-production`/`admin-production`
      GitHub environment, whose `VITE_*` variables are passed to `npm run build` and rendered
      into `dist/env-config.js` (the same `envsubst` the Docker image does at container start —
      see [`frontend.md`](frontend.md#conventions)). PR previews use those same production values.
      SPA routing relies on Pages' fallback to `index.html`, which only applies when the output
      has no `404.html`.
- **Image-gated deploys**: `backend-cicd.yml`, `frontend-cicd.yml` and `admin-cicd.yml` gate the
  deploy on tests run against a freshly built image, not just a unit-test run — see
  [`testing.md`](testing.md) for what each runs. For app/admin that image is the Docker
  equivalent of what Pages serves (same `dist/`, same runtime-config render), not the artifact
  that ships. `imgproxy-cicd.yml`/`storybook-cicd.yml` currently have no equivalent gate. The
  frontend workflow additionally uploads sourcemaps to Sentry on `main`.
- **E2E smoke tests**: `e2e-nightly.yml` runs the whole-repo `/e2e-tests/` suite on a nightly
  cron plus manual dispatch, decoupled from the deploy workflows — a slow or flaky run never
  blocks a deploy.
- **Android CI**: `android-ci.yml` runs on PRs/pushes touching `app/**`. Builds the Android web
  bundle, then `./gradlew assembleDebug`, and uploads the resulting APK as a build artifact.
  No signing config yet, so this stops at a debug artifact — no store publish or release build.

See [`infrastructure.md`](infrastructure.md#containers) for container build shape and
[`../operations/local-development.md`](../operations/local-development.md) for running the same
services locally.
