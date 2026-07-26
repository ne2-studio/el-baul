# Deployment (CI/CD)

- **Per-service workflows**: four independent, path-filtered GitHub Actions workflows —
  `backend-deploy.yml` (`api/**`), `frontend-deploy.yml` (`app/**`), `imgproxy-deploy.yml`
  (`imgproxy/**`), `storybook-deploy.yml` (`app/**`, `storybook/**`) — each triggered only by
  pushes to `main` touching its own paths. All four: build → build a Docker image → push to GHCR
  → trigger a Coolify deploy webhook.
- **Image-gated deploys**: `backend-deploy.yml` and `frontend-deploy.yml` gate the push on
  tests run against the freshly built image itself, not just a unit-test run — see
  [`testing.md`](testing.md) for what each runs. `imgproxy-deploy.yml`/`storybook-deploy.yml`
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
