---
name: run
description: "Provides a known, stable local El Baul environment. Use when asked to run, start, inspect, screenshot, or manually exercise the app or API."
model: haiku
---

## Goal

Provide one deterministic local environment and report exactly what is running.
Do not mix verification strategy, test-suite instructions, or historical
workarounds into this skill; use `verify` for deciding evidence.

Use the helper script from the repository root:

```bash
./scripts/run-env <mode>
```

If the script fails, do not work around it by starting services manually.
Use the helper's diagnostics and cleanup command. Fix repository-owned defects
when they are part of the task; otherwise report the failure. Do not stop or
modify unrelated user processes.

## Modes

| Mode | Use when | Frontend | Backend | Docker components | Dev components |
|---|---|---|---|---|---|
| `frontend-dev` | Inspecting or changing the consumer app UI | `http://localhost:5173` | `http://localhost:5051` | `fake-oidc`, `api-lite` | Vite app server |
| `backend-dev` | Inspecting or changing the real API with fast local recompilation and real infrastructure | none | `http://localhost:5050` | Postgres, MinIO, imgproxy, fake-oidc, Mailpit | `dotnet run` API |
| `full-stack` | Production-like wiring, containers, or infrastructure inspection | `http://localhost:3000` | `http://localhost:5050` | Postgres, MinIO, imgproxy, fake-oidc, Mailpit, API, app, admin | none |

`frontend-dev` deliberately uses `el-baul-api-lite`, not the real backend, so UI
work has a stable in-memory backend and Vite hot reload. It must not leave a
Docker frontend serving on `3000`.

`frontend-dev` is suitable for consumer UI work against the lite API contract.
It does not reproduce real persistence, storage, authentication wiring,
serialization, or built-image behavior.

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

Starting a mode must leave only the requested repository-owned environment
active. The helper may reconcile processes and compose stacks it owns from a
previous mode, but must not stop unrelated user processes. If an unrelated
process occupies a required port, report the conflict.

## Running

Choose the narrowest mode that matches the request:

```bash
./scripts/run-env frontend-dev
./scripts/run-env backend-dev
./scripts/run-env full-stack
```

The command waits until the requested surface is usable, not merely until its
process or TCP port exists:

- `frontend-dev`: Vite responds and `api-lite` is healthy.
- `backend-dev`: the API responds and required dependencies are ready.
- `full-stack`: the frontend loads and backend/infra surfaces are ready.

At the end, copy the concrete summary it prints, including:

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

Clearly identify one primary URL for the requested interaction: the `Frontend`
URL when a frontend exists, otherwise the `Backend` URL. Include the remaining
URLs in the environment summary when relevant.

## Identity

Local auth uses the repository's fake-oidc provider. Do not invent credentials.
Use only the test identities reported by the helper or documented in the
repository's fake-oidc configuration. In the browser, choose the desired
fake-oidc user in the provider flow.

### Getting a bearer token without a browser

`backend-dev` has no frontend to log in through. To call the real API directly
(`curl`, scripts) as a specific test identity — e.g. to reproduce or verify an
authorization bug across two different users — mint a token straight from
fake-oidc with:

```bash
./scripts/fake-oidc-token <user>   # user key from OIDC_USERS in docker-compose.yaml, e.g. admin or user
```

It prints only the access token to stdout, so it composes directly:

```bash
TOKEN=$(./scripts/fake-oidc-token admin)
curl -s http://localhost:5050/api/baules -H "Authorization: Bearer $TOKEN"
```

Works unchanged against `docker-compose.lite.yml` (`api-lite`, port 5051) —
run `./scripts/fake-oidc-token --help` for the client id/redirect URI
overrides and the `FAKE_OIDC_URL` env var.

## Logs and cleanup

Use the helper instead of ad hoc `docker ps` inspection:

```bash
./scripts/run-env logs frontend-dev
./scripts/run-env logs frontend-dev frontend
./scripts/run-env logs frontend-dev backend
./scripts/run-env logs backend-dev
./scripts/run-env logs backend-dev infra
./scripts/run-env logs full-stack
./scripts/run-env logs full-stack backend
./scripts/run-env cleanup
```

`cleanup` stops local dev processes and compose stacks started by the helper while
keeping named volumes.

## Advanced details

For deeper operational background, use:

- `docs/operations/local-development.md`
- `docs/operations/api-lite.md`
- `docs/architecture/testing.md` only when selecting verification evidence
