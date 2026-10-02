# Deployment (CI/CD)

- **Per-service workflows**: five independent, path-filtered GitHub Actions workflows —
  `backend-cicd.yml` (`api/**`), `frontend-cicd.yml` (`app/**`), `admin-cicd.yml` (`admin/**`),
  `imgproxy-cicd.yml` (`imgproxy/**`), `storybook-cicd.yml` (`app/**`, `storybook/**`). Each has
  two stages:
  - `build` (build/test): runs on every push to any branch and every PR touching its paths, with
    read-only permissions. Includes building and scanning the Docker image, which is only loaded
    locally — never pushed. Runs superseded on non-`main` refs are cancelled.
  - `deploy`: runs only on pushes to `main`, after `build` passes. Builds the image again (layers
    reused via the GHA cache), pushes it to GHCR as `:latest`/`:sha-<sha>`, then triggers the
    Coolify deploy webhook. Runs on `main` are never cancelled mid-flight.
- **Image-gated deploys**: `backend-cicd.yml` and `frontend-cicd.yml` gate the deploy on
  tests run against the freshly built image itself, not just a unit-test run — see
  [`testing.md`](testing.md) for what each runs. `imgproxy-cicd.yml`/`storybook-cicd.yml`
  currently have no equivalent gate. The frontend workflow additionally extracts `dist/` from
  the built image and uploads sourcemaps to Sentry — a step that needs Node/npm, not the image.
- **E2E smoke tests**: `e2e-nightly.yml` runs the whole-repo `/e2e-tests/` suite on a nightly
  cron plus manual dispatch, decoupled from the deploy workflows — a slow or flaky run never
  blocks a deploy.
- **Android CI**: `android-ci.yml` runs on PRs/pushes touching `app/**`. Builds the Android web
  bundle, then `./gradlew assembleDebug`, and uploads the resulting APK as a build artifact.
  No signing config yet, so this stops at a debug artifact — no store publish or release build.

See [`infrastructure.md`](infrastructure.md#containers) for container build shape and
[`../operations/local-development.md`](../operations/local-development.md) for running the same
services locally.
