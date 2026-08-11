# Devcontainer

## Open and Rebuild

Open this repository in a Dev Containers-compatible editor and choose **Rebuild Container**.
The container runs `.devcontainer/setup.sh` after creation, which restores NuGet packages and
runs `npm ci` in `app/`, `admin/`, and `e2e-tests/`.

The same setup can be exercised from the command line with the Dev Containers CLI:

```bash
devcontainer build --workspace-folder .
devcontainer up --workspace-folder .
```

## Base Image

This devcontainer extends:

```text
mcr.microsoft.com/playwright:v1.61.1-noble
```

The tag matches the repository's pinned `@playwright/test` version (`1.61.1`) in
`app/package-lock.json`, `admin/package-lock.json`, and `e2e-tests/package-lock.json`.
The image is pinned to Ubuntu Noble and includes its supported Node.js runtime (`v24.17.0`),
Chromium,
and Playwright's required browser system dependencies. The devcontainer sets
`PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` and `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` so
dependency installation does not download duplicate browser binaries. It also sets
`MSBUILDDISABLENODEREUSE=1` so repeated backend builds do not leave MSBuild worker
processes running inside the devcontainer. `DOCKER_BUILDKIT=1` and
`COMPOSE_DOCKER_CLI_BUILD=1` are set because the repository Dockerfiles use BuildKit-only
syntax such as `COPY --chmod`.

## Dependency Inventory

Already provided by the Playwright base image:

- Node.js `v24.17.0` and npm `11.13.0`.
- Chromium browser binaries in `/ms-playwright`.
- Playwright browser system dependencies for Ubuntu Noble.

Development tooling installed in the devcontainer:

- .NET SDK 10.0 for the backend's `net10.0` projects.
- Docker CLI `28.5.1`, Buildx `0.36.0`, and Docker Compose `v2.40.3` through the
  Docker-outside-of-Docker devcontainer feature.
- BuildKit-enabled Docker builds via environment variables; the Docker daemon itself is the
  host daemon.
- `curl`, `git`, `iproute2`, `procps`, `sudo`, `ca-certificates`, `gnupg`, and
  `lsb-release`.

Project dependencies installed through repository package managers:

- NuGet dependencies for `api/ElBaul.slnx`.
- NuGet dependencies for `api/acceptance-tests/ElBaul.AcceptanceTests.slnx`.
- npm dependencies for `app/`, `admin/`, and `e2e-tests/`.
- The app Storybook browser test script is limited to one Vitest worker and has a
  120-second browser-test timeout; the default browser concurrency and timeout can starve
  Storybook's local asset preloader under containerized verification.

Auxiliary services managed by existing Docker Compose files:

- `docker-compose.yaml`: Postgres, MinIO, imgproxy, fake-oidc, Mailpit, API, app, admin,
  and Storybook.
- `docker-compose.lite.yml`: fake-oidc, api-lite, app, and admin for frontend/admin
  acceptance tests.

Required host capabilities:

- Docker daemon access through the host Docker socket.
- Linux host networking support for the devcontainer, so repository scripts can keep using
  their fixed `localhost` port contract while Compose services run through Docker-outside-of-Docker.
- Internet access for image pulls, apt packages, NuGet restore, and npm registry access.
- Free fixed ports used by the repository scripts: `3000`, `3001`, `5000`, `5050`,
  `5051`, `5173`, `5432`, `6006`, `8025`, `8081`, `9000`, and `9001`.

Secrets and external dependencies not encoded in the image:

- Production OpenAI, Sentry, Resend, Zitadel, Coolify, and registry credentials.
- Local compose uses fake or blank values for these integrations where possible.
- `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal` and
  `TESTCONTAINERS_RYUK_DISABLED=true` are set for Docker-outside-of-Docker acceptance tests.
  Ryuk is disabled because its cleanup sidecar cannot initialize reliably through this
  socket/host-gateway arrangement; the acceptance fixture still disposes its containers
  explicitly.

## Run and Verify

Use the repository-owned scripts from the repository root:

```bash
./scripts/run-env frontend-dev
./scripts/run-env backend-dev
./scripts/run-env full-stack
./scripts/run-env cleanup
```

Canonical verification commands supported by the current script are:

```bash
./scripts/verify backend
./scripts/verify backend-acceptance
./scripts/verify frontend
./scripts/verify frontend-acceptance
./scripts/verify admin
./scripts/verify admin-acceptance
./scripts/verify e2e
./scripts/verify all
```

## Deliberate Exclusions

- The devcontainer does not install Playwright browsers or browser OS dependencies manually;
  those come from the pinned Playwright base image.
- The devcontainer does not replace `scripts/run-env`, `scripts/verify`, Dockerfiles, or
  Compose files with devcontainer-specific equivalents.
- Android SDK/JDK tooling is not installed because the run and verify scripts do not require
  Android builds.
- Production deployment and sourcemap upload secrets are not included.
