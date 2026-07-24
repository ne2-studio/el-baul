# El Baúl — Backend

ASP.NET Core (.NET 10) backend for El Baúl, following the conventions in
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md): a ports & adapters layout, PostgreSQL
via EF Core, JWT bearer auth against an external OIDC provider, MinIO (S3-compatible)
photo storage, and Serilog.

## Architecture

```
ElBaul.Api          — HTTP entry point for el-baul-api: real infra registration + Program.cs
ElBaul.Api.Lite     — HTTP entry point for el-baul-api-lite: in-memory infra + Program.cs
ElBaul.Api.Common   — shared with both: controllers, JWT validation, CORS, rate limiting, manager DI
ElBaul.Maintenance  — one-off maintenance CLI commands + the framework that runs them
ElBaul.Infra        — real adapters (EF Core repositories, MinIO photo storage, Hangfire)
ElBaul.Infra.Lite   — in-memory adapters (backs el-baul-api-lite and ElBaul.Tests' fakes)
ElBaul.Infra.Common — shared with both: auth/user-sync logic that doesn't touch real infra
ElBaul              — domain core (Application/ use cases, Ports/Input, Ports/Output)
```

`el-baul-api-lite` is a second, independently built image for frontend/Playwright testing —
same wire contract, everything in memory. See its own section under **Docker** below.

[`docker-image-tests/`](docker-image-tests/README.md) is a deliberately separate solution —
black-box acceptance tests for the *built Docker image* (`el-baul-api`, never the lite one),
not this source tree. See its own README for the full rule set; it runs in CI right after
`docker build`, before the image is pushed.

Domain: a **Baúl** (trunk) is owned by a custodian, holds **Chapters** of **Photos**
(each photo can carry **Recuerdos** — comments — from anyone with access), and can be
shared with other people as *colaborador* (can add chapters/photos) or *miembro*
(read-only) via **Persona** invitations, and **RemovalRequest**s
(a non-custodian asking to have a photo removed).

## API endpoints

Full request/response shapes are documented in [`docs/API.md`](../docs/API.md).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`/`POST` | `/api/baules` | Required | List/create baúles |
| `GET` | `/api/baules/{id}` | Required | Get a baúl (access-checked) |
| `GET`/`POST` | `/api/baules/{id}/personas` | Required | List Personas / invite a new one |
| `GET`/`PUT`/`DELETE` | `/api/baules/{id}/personas/{personaId}` | Required | Get/update/remove a Persona |
| `GET` | `/api/personas/{personaId}/invite-preview` | Public (rate-limited) | Preview for a Persona's invitation link |
| `POST` | `/api/personas/{personaId}/accept-invite` | Required | Claim a Persona invitation |
| `GET`/`POST` | `/api/baules/{id}/removal-requests` | Required | Photo removal requests |
| `POST` | `/api/baules/{id}/removal-requests/{id}/approve\|reject` | Required | Resolve a removal request |
| `GET`/`POST` | `/api/baules/{baulId}/chapters` | Required | Chapters |
| `GET`/`POST` | `/api/chapters/{chapterId}/photos` | Required | Photos (POST is multipart upload) |
| `DELETE` | `/api/photos/{photoId}` | Required (custodio only) | Soft-delete a photo, with a reason |
| `GET`/`POST` | `/api/photos/{photoId}/recuerdos` | Required | Comments on a photo |
| `GET` | `/api/users/me` | Required | Current user's profile |
| `GET` | `/health` | Public (rate-limited) | Liveness check |

## Getting started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/en-us/download)
- [Docker](https://www.docker.com/products/docker-desktop) (for PostgreSQL, MinIO, fake-oidc)

### Run dependencies locally

Easiest via the root `docker-compose.yaml` (brings up Postgres + MinIO + fake-oidc without
also building/running the API and frontend images):

```bash
docker compose up postgres minio fake-oidc
```

### Run the API

```bash
dotnet run --project ElBaul.Api
```

The API will be available at http://localhost:5050. Migrations and the MinIO bucket are
created automatically at startup. By default it expects fake-oidc reachable at
`http://localhost:5000` (see `appsettings.json`'s `Auth` section) — that matches the
compose setup above.

### Run tests

```bash
dotnet test
```

Runs everything in `ElBaul.slnx`: `ElBaul.Tests` uses hand-written fakes for
`Application/` business logic (no mocking framework); `ElBaul.Infra.Tests` uses targeted
unit tests for infra-layer logic (e.g. the MinIO signed-URL host rewrite); `ElBaul.Api.Tests`
covers controller-level concerns (authorization policies, the email-tracking endpoint).

**This does not include `docker-image-tests/`** — it's a deliberately separate solution
(`ElBaul.ImageTests.slnx`, not part of `ElBaul.slnx`) that black-box-tests the *built
Docker image* itself via Testcontainers, not this source tree. Anything that changes the
domain model, persistence (entities, EF configuration, migrations), or the public API
contract should be verified against it too, not just `dotnet test` — the unit suites above
run against hand-written fakes and can't catch a wire-format regression or an EF model that
fails to build against a real Postgres:

```bash
docker build -t el-baul-api:local .
BACKEND_IMAGE=el-baul-api:local dotnet test docker-image-tests/ElBaul.ImageTests.slnx
```

See [`docker-image-tests/README.md`](docker-image-tests/README.md) for what it covers
(Smoke / InfrastructureCompatibility / CriticalJourneys) and the rules it enforces on
itself. It also runs in CI right after `docker build`, before the image is pushed
(`.github/workflows/backend-deploy.yml`).

## Docker

Build the image:

```bash
docker build . -t el-baul-api
```

Run the container (pointed at services running on the host):

```bash
docker run --name el-baul-api \
  -e "ConnectionStrings__DefaultConnection=Host=host.docker.internal;Port=5432;Database=elbaul;Username=devuser;Password=devpass" \
  -e "Auth__JwksUri=http://host.docker.internal:5000/.well-known/jwks.json" \
  -e "Auth__ValidIssuer=http://localhost:5000" \
  -e "Auth__Audience=el-baul-app" \
  -e "Storage__Endpoint=http://host.docker.internal:9000" \
  -e "Storage__PublicEndpoint=http://localhost:9000" \
  -e "Storage__AccessKey=minioadmin" \
  -e "Storage__SecretKey=minioadmin" \
  -p 5050:8080 \
  el-baul-api
```

## el-baul-api-lite (in-memory image for frontend testing)

A second, independently built Docker image — `ElBaul.Api.Lite/Dockerfile` — that runs the
same API surface as `el-baul-api` but with every output port backed by an in-memory adapter
instead of Postgres/MinIO/imgproxy/Hangfire/OpenAI. It exists so Playwright/frontend work can
run against a fast, deterministic, disposable backend instead of the full compose stack, once
a task actually wires it into that pipeline (not done yet — this image is currently
build-and-run-manually only, see below).

It is a **separate image**, not a flag: there's no `ASPNETCORE_ENVIRONMENT`-style switch that
turns `el-baul-api` into this. `ElBaul.Api.Common`/`ElBaul.Infra.Common` hold everything that
must stay identical between the two (auth, CORS, rate limiting, controllers, the manager DI
graph, `UserSyncMiddleware`/`OidcUserInfoClient`) precisely so the HTTP pipeline and
auth/user-sync logic can never silently diverge between images — only the project graph below
differs:

```
ElBaul.Api.Lite ──┐
                  ├──→  ElBaul.Api.Common  ──┐
                  │                          ├──→  ElBaul.Infra.Common  ──→  ElBaul
                  └──→  ElBaul.Infra.Lite  ──┘
```

| Port | Real (`el-baul-api`) | Lite (`el-baul-api-lite`) |
|---|---|---|
| Repositories (`I*Repository`) | EF Core / Postgres | `InMemory*Repository` — the exact classes `ElBaul.Tests` uses, singleton-scoped so a run's data survives across requests |
| `IPhotoStorage` | MinIO + signed imgproxy URLs | `LitePhotoStorage` — an in-memory byte dictionary; `GetImageUrl` points at this image's own unauthenticated `GET /lite/photos/{*key}` endpoint instead of imgproxy (there's no MinIO/imgproxy in this image, and the frontend renders photo URLs as plain `<img src>` with no bearer token) |
| `IEmailSender`, `IAiChatBackend`, `IEmbeddingBackend`, `ISupportBackend`, `IEmailTemplateRenderer`, `IPhotoDateExtractor` | Resend/SMTP, OpenAI, LeadHub, real HTML templates, EXIF | Deterministic fakes (`ElBaul.Tests`'s `Fake*` classes) — no real network calls, no OpenAI cost, no flaky third parties |
| `IBackgroundJobScheduler` | Hangfire + Postgres storage | `FakeBackgroundJobScheduler` — records the call and does nothing else. **Welcome/weekly-digest emails are never actually sent in this image** — there's no Hangfire here at all, not even an in-memory storage provider |
| `IClock`, `IIdGenerator`, `ICurrentUserProvider`, `IAppConfiguration`, `IUserInfoClient` | Real implementations | The **same** real implementations (`ElBaul.Infra.Common`) — these don't touch Postgres/S3/Hangfire, so there's nothing to fake |
| Auth (JWT/OIDC) | fake-oidc / Zitadel | Unchanged — still needs a real fake-oidc container to mint tokens against |

Build and run it (paired with `fake-oidc` for login):

```bash
cd api
docker build -f ElBaul.Api.Lite/Dockerfile -t el-baul-api-lite:local .

docker network create el-baul-lite-test
docker run -d --name fake-oidc --network el-baul-lite-test -p 5000:5000 \
  -e OIDC_ISSUER="http://localhost:5000" \
  -e OIDC_CLIENTS='[{"clientId":"el-baul-app","redirectUris":["http://localhost:3000/callback"]}]' \
  -e OIDC_USERS='[{"key":"admin","sub":"admin-user","email":"admin@test.local","name":"Admin User","roles":["admin"]}]' \
  ghcr.io/ne2-studio/fake-oidc:latest

docker run -d --name el-baul-api-lite --network el-baul-lite-test -p 5051:8080 \
  -e Auth__JwksUri="http://fake-oidc:5000/.well-known/jwks.json" \
  -e Auth__ValidIssuer="http://localhost:5000" \
  -e Auth__Audience="el-baul-app" \
  -e Auth__UserInfoEndpoint="http://fake-oidc:5000/oidc/v1/userinfo" \
  -e Api__PublicUrl="http://localhost:5051" \
  el-baul-api-lite:local
```

`Api__PublicUrl` matters here specifically because `LitePhotoStorage` uses it to build the
`/lite/photos/{key}` URLs it hands back — it must be the address whatever's consuming the API
(a browser, Playwright) will actually reach the container on, not an internal Docker hostname.

Everything lives in memory for the container's process lifetime — `docker restart` (or a
fresh `docker run`) is currently the only way to reset state; there is no `/test/reset`
endpoint yet. `appsettings.json` in `ElBaul.Api.Lite/` carries the rest of the defaults
(`RateLimiter`, `Features`, `Serilog`) — override via env vars the same way as the real image.

**What a "wire this into frontend tests" task still needs to do** (all deliberately out of
scope so far — this image has only been built and smoke-tested manually):

- A compose file bringing up just `el-baul-api-lite` + `fake-oidc` + the frontend (no
  Postgres/MinIO/imgproxy/Mailpit) — dramatically fewer containers/healthchecks than
  `docker-compose.yaml`.
- Pointing `app/e2e/global-setup.ts` (or a new lite-specific Playwright config) at that
  compose file instead of the full stack.
- A decision on state isolation between spec files — restart-the-container is the only option
  today; a `/test/reset` endpoint (mentioned above) would be the natural next step if restart
  overhead becomes a problem.
- This image is **not** exercised by `docker-image-tests/` and shouldn't be — that suite
  exists specifically to verify the real image against real infrastructure (see its own
  README). There's currently no automated check that `el-baul-api-lite` still builds/works;
  it would need its own (lighter-weight) verification once it's wired into a real pipeline.

## Maintenance commands

The published image doubles as a one-off command runner: passing a recognized command
name as the first argument makes `ElBaul.Api.dll` run that command and exit instead of
starting the web server. This is safe to run against an **already-running** deployment
(Coolify, docker-compose, etc.) via `docker exec` — it's a separate process inside the
same container, so it can't crash or interrupt the running server, and each command is
written to keep going past per-item failures rather than aborting the whole run.

Commands themselves live in `ElBaul.Maintenance` (`Commands/`), not `ElBaul.Api` — a
command is a small class holding only business logic, registered by name via a
`[MaintenanceCommand("...")]` attribute. `Program.cs` just dispatches `args[0]` to that
project's `MaintenanceCommandRunner`, which bootstraps config/DI/logging the same way the
web app does (so `ASPNETCORE_ENVIRONMENT` and everything it drives — including which
appsettings file's Serilog section applies — resolves identically), runs the command
inside a canonical start/finish log pair (elapsed time, exit code), and flushes logs to
both stdout and Seq (when configured) before exiting.

### `backfill-exif-dates`

Finds every photo with no date, re-reads it from object storage, and retries EXIF
extraction — the same `IPhotoDateExtractor` the upload path uses. Safe to re-run anytime
(only ever looks at photos still missing a date, so photos it already dated are skipped
on the next run) and safe to run while the app is serving traffic.

```bash
# Coolify / any docker deployment: find the running API container, then:
docker exec <api-container> dotnet ElBaul.Api.dll backfill-exif-dates --dry-run
docker exec <api-container> dotnet ElBaul.Api.dll backfill-exif-dates

# Local dev (docker-compose service name is "api"):
docker compose exec api dotnet ElBaul.Api.dll backfill-exif-dates --dry-run
docker compose exec api dotnet ElBaul.Api.dll backfill-exif-dates

# Running the API outside Docker (dotnet run/dotnet ElBaul.Api.dll directly):
dotnet ElBaul.Api.dll backfill-exif-dates --dry-run
```

`--dry-run` logs what it would change without writing anything — run that first. Without
it, it updates the DB as it goes. Progress and a final summary (updated / no EXIF found /
failed counts) are logged to stdout; exit code is `0` if nothing failed, `1` otherwise.

### `backfill-recuerdo-baul-id`

Recuerdo now carries its own `BaulId` (denormalized from `Photo.BaulId`/`Chapter.BaulId`, or
set directly for standalone recuerdos with no photo or chapter) so the Recuerdos tab can
query a whole baúl without joining through Photo/Chapter. New recuerdos set it themselves;
this backfills it for every recuerdo created before that change, resolving it from the
recuerdo's `PhotoId` (photo's `BaulId`) or `ChapterId` (chapter's `BaulId`). Safe to re-run
anytime (only looks at recuerdos still missing a `BaulId`) and safe to run while the app is
serving traffic.

Unlike the other maintenance commands above, this one gates a follow-up migration: do not
deploy the build that makes `BaulId` `NOT NULL` until this command reports zero remaining
candidates — re-run with `--dry-run` after backfilling and confirm it logs
`0 recuerdo(s) to check` (and that the prior real run's `failed` count was `0`) before
deploying that migration. Applying it while nulls remain fails the migration outright and
the app won't start, since migrations run at startup.

```bash
# Coolify / any docker deployment: find the running API container, then:
docker exec <api-container> dotnet ElBaul.Api.dll backfill-recuerdo-baul-id --dry-run
docker exec <api-container> dotnet ElBaul.Api.dll backfill-recuerdo-baul-id

# Local dev (docker-compose service name is "api"):
docker compose exec api dotnet ElBaul.Api.dll backfill-recuerdo-baul-id --dry-run
docker compose exec api dotnet ElBaul.Api.dll backfill-recuerdo-baul-id

# Running the API outside Docker (dotnet run/dotnet ElBaul.Api.dll directly):
dotnet ElBaul.Api.dll backfill-recuerdo-baul-id --dry-run
```

`--dry-run` logs what it would change without writing anything — run that first. Without
it, it updates the DB as it goes. Progress and a final summary (updated / left null
(unresolvable) / failed counts) are logged to stdout; exit code is `0` if nothing failed,
`1` otherwise.

### A note on `Auth:JwksUri` vs `Auth:ValidIssuer`

The backend fetches JWKS (signing keys) from `Auth:JwksUri` directly rather than
following the OIDC discovery document's `jwks_uri` field. This matters in Docker: a
provider's discovery document embeds URLs built from its own issuer address (the one the
*browser* uses to sign in), which the backend container often can't reach under that same
hostname/port (e.g. `fake-oidc:5000` internally vs `localhost:5000` from the browser).
`Auth:JwksUri` is set to an address the **backend** can reach; `Auth:ValidIssuer` is set
to the address the **browser**/token's `iss` claim uses — they're allowed to differ.

## License

MIT © [Exeal](https://www.exeal.com)
