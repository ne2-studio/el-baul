# Backend architecture (`api/`)

ASP.NET Core (.NET 10), ports & adapters. See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for
where this fits in the wider system and [`../API-CONVENTIONS.md`](../API-CONVENTIONS.md) for
API-surface semantics.

## Project dependency rules

The backend builds into **two independent Docker images** — `el-baul-api` (real infra) and
`el-baul-api-lite` (everything in memory, for frontend/Playwright testing — see
[`../operations/api-lite.md`](../operations/api-lite.md)). They are never the same image behind
an `ASPNETCORE_ENVIRONMENT` switch; everything that must stay identical between them (the HTTP
pipeline, auth, the manager DI graph) lives in shared projects both hosts reference, so the two
images can't silently diverge on anything but which adapter backs each port:

```
ElBaul.Api ──────┐                          ElBaul.Api.Lite ──────┐
                 ├──→  ElBaul.Api.Common  ──┤                     │
ElBaul.Infra ────┤            │            ├──→  ElBaul.Infra.Lite┤
                 ├──→  ElBaul.Infra.Common ─┴─────────────────────┤
ElBaul.Maintenance ───┘                                           │
                                                                   ↓
                                                    ElBaul  (core: Application + Ports)
```

- **`ElBaul`** — domain/use-case core: `Application/` (one manager class per aggregate root,
  implementing its input port), `Ports/Input/` (use-case interfaces + DTOs), `Ports/Output/`
  (everything the core needs from the outside world — repositories, `IClock`, `IIdGenerator`,
  `ICurrentUserProvider`, `IPhotoStorage`, etc.). References only `CSharpFunctionalExtensions`
  and `Microsoft.Extensions.Logging.Abstractions` — **no ASP.NET Core, no DB driver, no ORM.**
  Fully unit-testable in isolation.
- **`ElBaul.Api` / `ElBaul.Api.Lite`** — thin `Program.cs` per image: register that image's own
  infrastructure, call the shared host bootstrap, then handle whatever's genuinely
  infra-specific (migrations/Hangfire dashboard for the real image; nothing extra for Lite).
  Neither references `ElBaul.Maintenance` (see below) — it's a separate executable, not
  something either web app dispatches into.
- **`ElBaul.Api.Common`** — everything about the HTTP host that doesn't depend on which
  infrastructure is behind it: controllers, request DTOs, `ErrorMapping`, JWT auth setup, CORS,
  rate limiting, the manager DI registrations, the middleware pipeline. Controllers depend only
  on `Ports/Input` interfaces, never on `Infra`/`Infra.Lite` or `Application` concrete types.
- **`ElBaul.Infra` / `ElBaul.Infra.Lite`** — implement every output port with real adapters (EF
  Core repositories, MinIO, Hangfire) or in-memory ones, respectively. `ElBaul.Infra.Lite` never
  references `ElBaul.Infra` — no Npgsql/AWSSDK/Hangfire dependency at all. Each exposes its own
  composition-root method (`AddInfrastructure()`/`AddLiteInfrastructure()`).
- **`ElBaul.Infra.Common`** — the output-port implementations that don't depend on
  Postgres/S3/Hangfire and so are identical in both images (clock, id generator, current-user
  provider, user-sync middleware, OIDC userinfo client). Referenced by both Infra projects.
- **`ElBaul.Maintenance`** — one-off maintenance CLI commands, with its own `Program.cs`
  (`OutputType=Exe`). References `ElBaul.Infra` and `ElBaul`, never `ElBaul.Api`. Published
  alongside `ElBaul.Api` into the same `el-baul-api` image/container so it can be invoked via
  `docker exec ... dotnet ElBaul.Maintenance.dll <command>`, but the two are independent
  executables — there's no compile-time or runtime dependency between them. See
  [`../operations/maintenance-commands.md`](../operations/maintenance-commands.md).

`api/acceptance-tests/` is a deliberately separate solution testing the *built image* — see
[`architecture/testing.md`](testing.md).

## Controllers

Controllers are thin HTTP adapters: one per resource area, each handler delegates to an input
port method and maps the `Result`/`Result<T>` to an HTTP response. They must not contain domain
logic or depend directly on infrastructure. Every endpoint is `[Authorize]` by default except
the few explicitly anonymous ones documented in [`../API-CONVENTIONS.md`](../API-CONVENTIONS.md).
The caller's identity is never a controller parameter — use cases call
`ICurrentUserProvider.GetUserId()` themselves.

**Error mapping**: `ErrorMapping.ToActionResult` (`api/ElBaul.Api.Common/ErrorMapping.cs`) maps
an input-port `Result`/`Result<T>` failure's `ApplicationError.Code` to a status code. The
observable body remains `{ "error": "..." }`, but the status no longer depends on the message
text: `Validation` → 400, `Forbidden` → 403, `NotFound` → 404, and
`ExternalDependencyUnavailable` → 503. See [`../API-CONVENTIONS.md`](../API-CONVENTIONS.md) for
the resulting observable semantics.

## Auth

- `JwtBearer` validates access tokens. Signing keys are fetched directly from a configured
  `Auth:JwksUri` and cached in-process, **not** resolved from the token issuer's discovery
  document, because in Docker the backend and the browser often can't reach the OIDC provider
  under the same hostname (e.g. `fake-oidc:5000` internally vs `localhost:5000` from the
  browser) — `Auth:JwksUri` (backend-reachable) and `Auth:ValidIssuer` (browser/token-`iss`
  address) are configured independently instead of letting the library auto-discover.
- `UserSyncMiddleware` (`ElBaul.Infra.Common`, shared with `el-baul-api-lite`) just-in-time syncs
  the local `Users` row for the authenticated `sub` claim, since OIDC access tokens only carry
  `sub` and baúl-sharing needs a local user row to exist.
- `UserLogContextMiddleware` (`ElBaul.Api.Common`) pushes the authenticated user id onto
  Serilog's `LogContext` so every log line for a request carries `{UserId}` without call sites
  threading it through explicitly.
- `Application/` use-case code never reads `HttpContext`/claims directly — `UserSyncMiddleware`,
  `UserLogContextMiddleware`, and `HttpContextCurrentUserProvider` are the only places that do.

## Core conventions

- **Every external effect sits behind an output port** (`IClock`, `IIdGenerator`,
  `ICurrentUserProvider`, `IPhotoStorage`, `IPhotoDateExtractor`, …) — this is what makes
  `Application/` managers unit-testable with shared hand-written fakes by default and small
  NSubstitute stubs where a test only needs one collaborator method or one injected failure.
- **Access control is centralized in `BaulAccessService`**, not via a global filter and not
  re-derived per manager: it's the single interpretation of "does this user belong to this baúl
  / are they an admin of it". Every manager touching a baúl-scoped resource calls
  `baulAccess.AuthorizeAsync(...)` instead of re-implementing the check inline.
- **One deliberate exception**: `BaulInviteLinkManager.AcceptAsync` creates or claims a Persona
  without going through the admin-only authorization path that gates
  `PersonaManager.CreatePersonaAsync` — the caller is authorizing themselves by presenting a
  baúl-scoped invite token, not by baúl-admin privilege. Any future tightening of Persona
  creation (rate-limiting joins per baúl, etc.) needs to account for this second creation path.
- **DI lifetimes are `Scoped` by default.** `MinioPhotoStorage` is the one deliberate
  `Singleton`, since it wraps a single `AmazonS3Client` (thread-safe, meant to be pooled).
- No decorator or null-object patterns are in use — infra concerns compose behavior directly
  rather than through a wrapping layer.

## Data access

- **EF Core** over PostgreSQL, chosen for the relational, many-to-many-ish domain shape.
  Table/column mapping via Fluent API (`EntityConfigurations/`), not data annotations.
- Migrations apply automatically at startup (`dbContext.Database.MigrateAsync()`), never a
  manual deploy step.
- **IDs**: `Guid` primary keys for domain entities; `User` is keyed by the OIDC `sub` claim
  instead (opaque `text` — OIDC subject ids aren't guaranteed GUID-shaped).
- **Photos are soft-deleted** (`PhotoStatus.Active`/`Deleted`), driven by the removal-request
  workflow rather than a hard `DELETE`.
- **Photo dates are partial** (year/month/day, all nullable) — a photo with no date is still
  valid, not defaulted into a sort position.
- **Timestamps**: `CreatedAt`/`UpdatedAt` set via `IClock` (UTC), not DB defaults.

## Maintenance commands

`ElBaul.Maintenance` is its own executable, with its own `Program.cs`, entirely separate from
`ElBaul.Api`'s. A command is a class holding only business logic, registered by name
(`MaintenanceCommandRunner` discovers it via reflection) so it can be run standalone against an
already-running deployment via `docker exec ... dotnet ElBaul.Maintenance.dll <command>`. See
[`../operations/maintenance-commands.md`](../operations/maintenance-commands.md) for how to add
a command and how to run one, locally and in production.

## Other conventions

- **Logging**: Serilog, console + Seq sinks, request logging via `UseSerilogRequestLogging()`.
- **API docs**: Swagger/Swashbuckle, enabled only in `Development`.
- **CORS**: `AllowAnyOrigin`/`AllowAnyMethod`/`AllowAnyHeader` — acceptable since auth is bearer
  token, not cookies/origin-based.
- **Rate limiting**: unauthenticated endpoints use the fixed-window `PublicLimiter` policy,
  keyed by client IP. The current public surface is `/health`, `GET /api/app-config`,
  `GET /api/baul-invites/{token}/preview`, and `GET /email/click/{token}`. Chat
  message and suggestion endpoints additionally use `ChatLimiter`, keyed by authenticated
  user id, because each call can spend AI budget.
- **Config**: `appsettings.json` (dev defaults committed) + `appsettings.Production.json` +
  environment variables in the container — see `docker-compose.yaml` for the local set. Never
  commit production secrets.
