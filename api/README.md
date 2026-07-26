# El Baúl — Backend

ASP.NET Core (.NET 10) backend for El Baúl.

## Run

The public surface is two independently built Docker images — nothing else in this
directory is meant to be run standalone.

### `el-baul-api` (real backend)

```bash
docker build -t el-baul-api .
docker run -p 5050:8080 \
  -e ConnectionStrings__DefaultConnection="Host=<postgres-host>;Port=5432;Database=elbaul;Username=<user>;Password=<pass>" \
  -e Auth__JwksUri="<oidc-issuer>/.well-known/jwks.json" \
  -e Auth__ValidIssuer="<oidc-issuer>" \
  -e Auth__Audience="el-baul-app" \
  -e Storage__Endpoint="<minio-endpoint>" \
  -e Storage__AccessKey="<minio-access-key>" \
  -e Storage__SecretKey="<minio-secret-key>" \
  -e Storage__BucketName="el-baul-photos" \
  -e Imgproxy__BaseUrl="<imgproxy-public-url>" \
  -e Imgproxy__Key="<imgproxy-key>" \
  -e Imgproxy__Salt="<imgproxy-salt>" \
  -e Api__PublicUrl="<this-api's-own-public-url>" \
  el-baul-api
```

That's the minimum for the container to start and serve traffic — migrations and the
MinIO bucket are created automatically. `appsettings.json` is the source of truth for
the full set of optional settings (email sending, AI chat, Hangfire dashboard
credentials, etc.) and their defaults; every setting is overridable the same way, via
`Section__Key` env vars. See
[`docs/operations/local-development.md`](../docs/operations/local-development.md) for
a complete working example wired to this repo's local compose stack.

Without building the image, against host-run dependencies:

```bash
docker compose up postgres minio fake-oidc
dotnet run --project ElBaul.Api
```

### `el-baul-api-lite` (in-memory backend, for frontend/E2E testing)

```bash
docker build -f ElBaul.Api.Lite/Dockerfile -t el-baul-api-lite .
docker run -p 5051:8080 \
  -e Auth__JwksUri="<oidc-issuer>/.well-known/jwks.json" \
  -e Auth__ValidIssuer="<oidc-issuer>" \
  -e Auth__Audience="el-baul-app" \
  -e Auth__UserInfoEndpoint="<oidc-issuer>/oidc/v1/userinfo" \
  -e Api__PublicUrl="http://localhost:5051" \
  el-baul-api-lite
```

No Postgres/MinIO needed — everything lives in memory for the container's process
lifetime. See [`docs/operations/api-lite.md`](../docs/operations/api-lite.md) for what's
faked, pairing it with fake-oidc, and the state-reset caveat.

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

## API routes

Routes and request/response shapes are generated OpenAPI, not documented here — restating
them in prose just goes stale. Run the stack (see Run above) and open
`http://localhost:5050/swagger`, or fetch `http://localhost:5050/swagger/v1/swagger.json`
directly. Semantic rules that don't show up in a generated schema (authorization, error
codes, invitations, photos, display names) are in
[`docs/API-CONVENTIONS.md`](../docs/API-CONVENTIONS.md).

## Structure

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

## Further documentation

- Backend architecture: [`docs/architecture/backend.md`](../docs/architecture/backend.md)
- Testing strategy: [`docs/architecture/testing.md`](../docs/architecture/testing.md)
- API conventions: [`docs/API-CONVENTIONS.md`](../docs/API-CONVENTIONS.md)
- Local development: [`docs/operations/local-development.md`](../docs/operations/local-development.md)
- `el-baul-api-lite`: [`docs/operations/api-lite.md`](../docs/operations/api-lite.md)
- Maintenance commands: [`docs/operations/maintenance-commands.md`](../docs/operations/maintenance-commands.md)

## License

MIT © [Exeal](https://www.exeal.com)
