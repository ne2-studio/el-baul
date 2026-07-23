# El Baúl — Backend

ASP.NET Core (.NET 10) backend for El Baúl, following the conventions in
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md): a ports & adapters layout, PostgreSQL
via EF Core, JWT bearer auth against an external OIDC provider, MinIO (S3-compatible)
photo storage, and Serilog.

## Architecture

```
ElBaul.Api      — HTTP entry point (controllers, JWT validation, composition root)
ElBaul.Infra    — adapters (EF Core repositories, MinIO photo storage, JIT user sync)
ElBaul          — domain core (Application/ use cases, Ports/Input, Ports/Output)
```

Domain: a **Baúl** (trunk) is owned by a custodian, holds **Albums** of **Photos**
(each photo can carry **Recuerdos** — comments — from anyone with access), and can be
shared with other users as *colaborador* (can add albums/photos) or *miembro*
(read-only) via **SharedUser** invitations, and **RemovalRequest**s
(a non-custodian asking to have a photo removed).

## API endpoints

Full request/response shapes are documented in [`docs/API.md`](../docs/API.md).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`/`POST` | `/api/baules` | Required | List/create baúles |
| `GET` | `/api/baules/{id}` | Required | Get a baúl (access-checked) |
| `GET` | `/api/baules/{id}/preview` | Public (rate-limited) | Preview for an invitation link |
| `POST` | `/api/baules/{id}/accept-invite` | Required | Join a baúl as *miembro* |
| `GET`/`POST` | `/api/baules/{id}/shared-users` \| `/share` | Required | Sharing |
| `PUT`/`DELETE` | `/api/baules/{id}/shared-users/{..}` | Required | Update role / revoke access |
| `GET`/`POST` | `/api/baules/{id}/removal-requests` | Required | Photo removal requests |
| `POST` | `/api/baules/{id}/removal-requests/{id}/approve\|reject` | Required | Resolve a removal request |
| `GET`/`POST` | `/api/baules/{baulId}/albums` | Required | Albums |
| `GET`/`POST` | `/api/albums/{albumId}/photos` | Required | Photos (POST is multipart upload) |
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

Two-tier: `ElBaul.Tests` uses hand-written fakes for `Application/` business logic (no
mocking framework); `ElBaul.Infra.Tests` uses targeted unit tests for infra-layer logic
(e.g. the MinIO signed-URL host rewrite).

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

## Maintenance commands

The published image doubles as a one-off command runner: passing a recognized command
name as the first argument makes `ElBaul.Api.dll` run that command and exit instead of
starting the web server. This is safe to run against an **already-running** deployment
(Coolify, docker-compose, etc.) via `docker exec` — it's a separate process inside the
same container, so it can't crash or interrupt the running server, and each command is
written to keep going past per-item failures rather than aborting the whole run.

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

### `backfill-recuerdo-album-id`

Recuerdo now carries its own `AlbumId` (denormalized from the associated photo's `AlbumId`)
so the Recuerdos feed can query by chapter without joining through Photo. New recuerdos set
it themselves; this backfills it for every recuerdo created before that change (has a
`PhotoId` but no `AlbumId` yet). Safe to re-run anytime (only looks at recuerdos still
missing an `AlbumId`) and safe to run while the app is serving traffic.

```bash
# Coolify / any docker deployment: find the running API container, then:
docker exec <api-container> dotnet ElBaul.Api.dll backfill-recuerdo-album-id --dry-run
docker exec <api-container> dotnet ElBaul.Api.dll backfill-recuerdo-album-id

# Local dev (docker-compose service name is "api"):
docker compose exec api dotnet ElBaul.Api.dll backfill-recuerdo-album-id --dry-run
docker compose exec api dotnet ElBaul.Api.dll backfill-recuerdo-album-id

# Running the API outside Docker (dotnet run/dotnet ElBaul.Api.dll directly):
dotnet ElBaul.Api.dll backfill-recuerdo-album-id --dry-run
```

`--dry-run` logs what it would change without writing anything — run that first. Without
it, it updates the DB as it goes. A recuerdo whose photo is loose (no album) is left with a
null `AlbumId` and counted separately, not as a failure. Progress and a final summary
(updated / left null / failed counts) are logged to stdout; exit code is `0` if nothing
failed, `1` otherwise.

### `backfill-recuerdo-baul-id`

Recuerdo now carries its own `BaulId` (denormalized from `Photo.BaulId`/`Album.BaulId`, or
set directly for standalone recuerdos with no photo or chapter) so the Recuerdos tab can
query a whole baúl without joining through Photo/Album. New recuerdos set it themselves;
this backfills it for every recuerdo created before that change, resolving it from the
recuerdo's `PhotoId` (photo's `BaulId`) or `AlbumId` (album's `BaulId`). Safe to re-run
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

### `migrate-photo-captions-to-recuerdos`

Captions used to be the only way to add text to a photo; recuerdos replaced that. This
finds every active photo with a non-empty caption, creates a recuerdo from it (authored by
the photo's uploader, dated at the time the command runs — the original caption carries no
timestamp of its own to preserve), and clears the photo's caption. Safe to re-run anytime
(only looks at photos that still have a caption, so already-migrated photos are skipped on
the next run) and safe to run while the app is serving traffic.

```bash
# Coolify / any docker deployment: find the running API container, then:
docker exec <api-container> dotnet ElBaul.Api.dll migrate-photo-captions-to-recuerdos --dry-run
docker exec <api-container> dotnet ElBaul.Api.dll migrate-photo-captions-to-recuerdos

# Local dev (docker-compose service name is "api"):
docker compose exec api dotnet ElBaul.Api.dll migrate-photo-captions-to-recuerdos --dry-run
docker compose exec api dotnet ElBaul.Api.dll migrate-photo-captions-to-recuerdos

# Running the API outside Docker (dotnet run/dotnet ElBaul.Api.dll directly):
dotnet ElBaul.Api.dll migrate-photo-captions-to-recuerdos --dry-run
```

`--dry-run` logs what it would change without writing anything — run that first. Without
it, it updates the DB as it goes. Progress and a final summary (migrated / failed counts)
are logged to stdout; exit code is `0` if nothing failed, `1` otherwise.

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
