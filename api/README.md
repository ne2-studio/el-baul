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
(read-only) via **SharedUser** invitations, **AccessRequest**s, and **RemovalRequest**s
(a non-custodian asking to have a photo removed). An **Activity** feed records
baúl-scoped events (new photos, role changes, access requests/grants, removal requests).

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
| `GET`/`POST` | `/api/baules/{id}/access-requests` | Required | Access requests |
| `POST` | `/api/baules/{id}/access-requests/{id}/approve\|reject` | Required | Resolve an access request |
| `GET`/`POST` | `/api/baules/{id}/removal-requests` | Required | Photo removal requests |
| `POST` | `/api/baules/{id}/removal-requests/{id}/approve\|reject` | Required | Resolve a removal request |
| `GET`/`POST` | `/api/baules/{baulId}/albums` | Required | Albums |
| `GET`/`POST` | `/api/albums/{albumId}/photos` | Required | Photos (POST is multipart upload) |
| `GET`/`POST` | `/api/photos/{photoId}/recuerdos` | Required | Comments on a photo |
| `GET` | `/api/activities` | Required | Activity feed across the caller's baúles |
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
