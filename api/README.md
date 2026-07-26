# El Baúl — Backend

ASP.NET Core (.NET 10) backend for El Baúl.

## Projects

```
ElBaul              — domain core (Application/ use cases, Ports/Input, Ports/Output)
ElBaul.Api          — HTTP entry point for el-baul-api: real infra registration + Program.cs
ElBaul.Api.Lite     — HTTP entry point for el-baul-api-lite: in-memory infra + Program.cs
ElBaul.Api.Common   — shared with both: controllers, JWT validation, CORS, rate limiting, manager DI
ElBaul.Infra        — real adapters (EF Core repositories, MinIO photo storage, Hangfire)
ElBaul.Infra.Lite   — in-memory adapters (backs el-baul-api-lite and ElBaul.Tests' fakes)
ElBaul.Infra.Common — shared with both: auth/user-sync logic that doesn't touch real infra
ElBaul.Maintenance  — one-off maintenance CLI commands + the framework that runs them
docker-image-tests  — separate solution, black-box tests for the built image
```

See [`docs/architecture/backend.md`](../docs/architecture/backend.md) for dependency rules and
conventions.

## API endpoints

Full request/response shapes are generated OpenAPI (`/swagger` in Development — see the `run`
skill); semantic rules not visible in a schema are in
[`docs/API-CONVENTIONS.md`](../docs/API-CONVENTIONS.md).

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

## Run

```bash
docker compose up postgres minio fake-oidc
dotnet run --project ElBaul.Api
```

The API is then available at http://localhost:5050. Migrations and the MinIO bucket are created
automatically at startup. See
[`docs/operations/local-development.md`](../docs/operations/local-development.md) for running
it in Docker instead, or against the full compose stack.

## Verify

```bash
dotnet test
```

Runs everything in `ElBaul.slnx` — see [`docs/architecture/testing.md`](../docs/architecture/testing.md)
for what each test project covers.

Changes to the domain model, persistence, or the public API contract also require the image
tests (a separate solution, not part of `ElBaul.slnx`):

```bash
docker build -t el-baul-api:local .
BACKEND_IMAGE=el-baul-api:local dotnet test docker-image-tests/ElBaul.ImageTests.slnx
```

See [`docker-image-tests/README.md`](docker-image-tests/README.md) for what it covers and the
rules it enforces on itself.

## Further documentation

- Backend architecture: [`docs/architecture/backend.md`](../docs/architecture/backend.md)
- Testing strategy: [`docs/architecture/testing.md`](../docs/architecture/testing.md)
- API conventions: [`docs/API-CONVENTIONS.md`](../docs/API-CONVENTIONS.md)
- Local development: [`docs/operations/local-development.md`](../docs/operations/local-development.md)
- `el-baul-api-lite`: [`docs/operations/api-lite.md`](../docs/operations/api-lite.md)
- Maintenance commands: [`docs/operations/maintenance-commands.md`](../docs/operations/maintenance-commands.md)

## License

MIT © [Exeal](https://www.exeal.com)
