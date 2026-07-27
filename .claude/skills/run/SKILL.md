---
name: run
description: "Provides a known, stable local El Baul environment. Use when asked to run, start, inspect, screenshot, or manually exercise the app or API."
---

## Goal

Provide one deterministic local environment and report exactly what is running.
Do not mix verification strategy, test-suite instructions, or historical
workarounds into this skill; use `verify` for deciding evidence.

Use the helper script from the repository root:

```bash
./scripts/run-env <mode>
```

If the script fails, do not work around it by starting services manually. Fix the
environment conflict or report the failure.

## Modes

| Mode | Use when | Frontend | Backend | Docker components | Dev components |
|---|---|---|---|---|---|
| `frontend-dev` | Inspecting or changing the consumer app UI | `http://localhost:5173` | `http://localhost:5051` | `fake-oidc`, `api-lite` | Vite app server |
| `backend-dev` | Inspecting the local backend/API without a frontend | none | `http://localhost:5050` | Postgres, MinIO, imgproxy, fake-oidc, Mailpit | `dotnet run` API |
| `full-stack` | Production-like wiring, containers, or infrastructure inspection | `http://localhost:3000` | `http://localhost:5050` | Postgres, MinIO, imgproxy, fake-oidc, Mailpit, API, app, admin | none |

`frontend-dev` deliberately uses `el-baul-api-lite`, not the real backend, so UI
work has a stable in-memory backend and Vite hot reload. It must not leave a
Docker frontend serving on `3000`.

## Port contract

- Consumer app Vite dev: `http://localhost:5173`
- Consumer app Docker image: `http://localhost:3000`
- Admin Docker image: `http://localhost:3001`
- Real backend: `http://localhost:5050`
- Lite backend: `http://localhost:5051`
- fake-oidc: `http://localhost:5000`
- imgproxy: `http://localhost:8081`
- MinIO console: `http://localhost:9001`
- Mailpit: `http://localhost:8025`

Ports are fixed. The helper must fail on ambiguous conflicts instead of silently
switching ports.

## Running

Choose the narrowest mode that matches the request:

```bash
./scripts/run-env frontend-dev
./scripts/run-env backend-dev
./scripts/run-env full-stack
```

The command waits for real readiness checks before returning. At the end, copy
the concrete summary it prints, including:

```text
Mode:
Frontend:
Backend:
Frontend source:
Backend source:
Health:
Test user:
Logs:
Cleanup:
```

Return exactly one primary URL for the chosen mode: the `Frontend` URL when a
frontend exists, otherwise the `Backend` URL.

## Identity

Local auth uses the repository's fake-oidc provider. Do not invent credentials.
The configured test identities are:

- `admin` -> `admin-user` / `Admin User`
- `user` -> `normal-user` / `Normal User`

In the browser, choose the desired fake-oidc user in the provider flow.

## Logs and cleanup

Use the helper instead of ad hoc `docker ps` inspection:

```bash
./scripts/run-env logs frontend-dev
./scripts/run-env logs backend-dev
./scripts/run-env logs full-stack
./scripts/run-env cleanup
```

`cleanup` stops local dev processes and compose stacks started by the helper while
keeping named volumes.

## Advanced details

For deeper operational background, use:

- `docs/operations/local-development.md`
- `docs/operations/api-lite.md`
- `docs/architecture/testing.md` only when selecting verification evidence
