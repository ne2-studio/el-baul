# El Baúl backend — Docker image acceptance tests

Black-box acceptance tests for the **built backend Docker image**, not the backend source
code. The subject under test is the artifact — the same image that gets pushed to GHCR and
deployed — imagined as if it had been built by an external provider handed nothing but the
image, its environment-variable contract, and its public HTTP API.

This is deliberately a separate project from the rest of `api/` (its own directory, its own
`.slnx`, no shared solution) so it cannot accidentally acquire a dependency on backend source.

## Rules

These are not guidelines, they're enforced (either by `ArchitectureRulesTests.cs`, which runs
on every `dotnet test`, or structurally, by what this project simply has no way to do):

- **No `ProjectReference` to anything under `api/ElBaul*/`.** Checked by
  `ArchitectureRulesTests.This_project_has_no_ProjectReference_to_anything`, which reads this
  project's own `.csproj` and fails if one appears — a change here (rather than a silent
  merge) is what a reviewer should see if this rule is ever violated.
- **No shared fixtures, no reused internal DTOs.** Response shapes are asserted via
  `JsonDocument`/local minimal records defined in this project, never by referencing
  `ElBaul.Api`'s `Models/` or `ElBaul`'s `Ports/` types. A wire-format regression the backend's
  own tests wouldn't catch (because they'd recompile against the same, now-broken, shared type)
  is exactly the kind of bug this project exists to catch.
- **No direct database access**, except to verify persistence/migrations explicitly (see
  `InfrastructureCompatibility/InfrastructureCompatibilityTests.cs`, which runs `psql` inside
  the Postgres container itself via `ExecAsync` — not EF Core, not a connection string parsed
  out of backend config).
- **The image is always supplied from outside**, via the `BACKEND_IMAGE` environment variable
  (see `ElBaulImageFixture.InitializeAsync`) — never built from source as part of running these
  tests. That's what makes the subject under test unambiguously the artifact, not the code.
- **No `WebApplicationFactory`.** The backend only ever exists here as a real container,
  reached over the network like any other client would reach it.
- **No calling backend classes, handlers, or repositories directly**, and **no replacing
  services via DI.** There is no DI container in this project pointed at the backend — there's
  an `HttpClient`.
- **External dependencies are real containers** (Postgres, MinIO, `ghcr.io/ne2-studio/fake-oidc`)
  on an isolated Testcontainers network, configured the same way an operator would — public
  images, env vars, ports — never fakes wired in-process.
- **Assertions are on observable behavior only**: HTTP status codes, response bodies, container
  state/exit codes, bytes round-tripped through the API. Nothing here can see inside the
  process.

## What's covered — and, as importantly, what isn't

Three groups, in `Smoke/`, `InfrastructureCompatibility/`, and `CriticalJourneys/`:

- **Smoke** — does the image start, stay up, answer `/health`, actually listen on its
  published port, pick up configuration from environment variables, and fail fast and
  diagnosably (non-zero exit, non-empty logs — not a silent hang) when a required external
  dependency (Postgres) is unreachable.
- **Infrastructure compatibility** — does it actually talk to Postgres (migrations ran, the
  expected tables exist) and MinIO (its photo bucket exists, checked via a throwaway `minio/mc`
  container), and is it genuinely traversing a Docker network/port mapping rather than
  something like `--network=host`.
- **Critical journeys** — deliberately narrow. One full journey (get a real token from
  fake-oidc → create a baúl → create a chapter → upload a photo → download the exact same
  bytes back → add a recuerdo) plus one boundary check (an unauthenticated request to a
  protected endpoint is rejected). This is not a second copy of the backend's own domain test
  suite — `ElBaul.Tests` already covers every business rule far more cheaply against
  hand-written fakes. This only proves the image's public wire contract still works end to end.

## Running locally

Build the image, then point these tests at it:

```bash
# from api/
docker build -t el-baul-api:local .
BACKEND_IMAGE=el-baul-api:local dotnet test docker-image-tests/ElBaul.ImageTests.slnx
```

Requires a running Docker daemon reachable from the test process (Testcontainers talks to it
directly — no extra configuration needed on a normal local Docker Desktop/Engine setup).

## Running in CI

`.github/workflows/backend-deploy.yml` runs this straight after `docker build` and before
`docker push` — the image these tests exercise is the exact one about to be pushed and
deployed, still sitting in the runner's local Docker daemon, never pulled from a registry.
A failure here blocks the push (and therefore the Coolify deploy trigger after it).
