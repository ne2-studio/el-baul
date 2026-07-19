# El Baúl Architecture

This document describes the architecture actually in place for El Baúl: project structure,
layering, and conventions for both services, plus the surrounding infrastructure (image
serving, auth, CI/CD). Follow these patterns when extending the app; if you deviate, leave a
comment explaining why.

## System overview

Monorepo with two independently deployable services, no shared code between them, plus a
small image-processing sidecar:

| Directory | Stack |
|---|---|
| `app/` | React 18, TypeScript, Vite, Tailwind CSS v4, Zustand, react-router-dom v7, react-oidc-context, Capacitor (Android), vite-plugin-pwa |
| `api/` | ASP.NET Core (.NET 10), PostgreSQL via EF Core, MinIO (S3-compatible), Serilog |
| `imgproxy/` | An [imgproxy](https://imgproxy.net/) instance, its own Dockerfile/deploy, serving resized photos directly from MinIO via named presets |

El Baúl is a private, shared photo archive: a **baúl** (trunk) is a family archive owned by a
**custodio** (custodian), containing **albums**, each holding **photos**. A baúl is shared with
other people as **personas** — a per-baúl identity (nickname + role: `Colaborador`,
`Administrador`, or `Custodio`) distinct from the underlying account, so a "recuerdo" (a memory/
comment left on a photo or album) is always attributed to the nickname the family chose, not
whatever name the OIDC provider has on file. Non-custodian members can request a photo's removal
(`RemovalRequest`); the custodian approves or rejects it — photos are never hard-deleted by
anyone else.

Auth is OIDC/JWT Bearer end-to-end (Zitadel in practice): the frontend authenticates against the
external OIDC provider, attaches the access token to every API call, and the backend validates it
via `JwtBearer` middleware. There is no session state on the backend — every request is
authenticated independently and scoped to the caller's identity.

---

## Backend (`api/`)

### Architecture: ports & adapters

The backend is split across three projects, with dependencies pointing inward toward the core:

```
ElBaul.Api    ──┐
                ├──→  ElBaul  (core: Application + Ports)
ElBaul.Infra  ──┘
```

- **`ElBaul` (core)** — the domain/use-case project. Contains:
  - `Application/` — one class per aggregate root (`BaulManager`, `AlbumManager`,
    `PhotoManager`, `UserManager`), each implementing its input port and holding all business
    logic for that area, plus a shared `DtoMapping.cs`.
  - `Ports/Input/` — use-case interfaces (`IBaulManager`, `IAlbumManager`, `IPhotoManager`,
    `IUserManager`) and their DTOs (plain `record` types) — the contract the API layer calls
    into.
  - `Ports/Output/` — interfaces for everything the core needs from the outside world:
    repositories (`IBaulRepository`, `IAlbumRepository`, `IPhotoRepository`,
    `IRecuerdoRepository`, `IUserRepository`), `IClock`, `IIdGenerator`, `ICurrentUserProvider`,
    `IPhotoStorage`, `IPhotoDateExtractor`, `IUserInfoClient` — plus the domain records
    themselves (`Baul`, `Album`, `Photo`, `Recuerdo`, `SharedUser`, `RemovalRequest`, `User`).
  - References only `CSharpFunctionalExtensions` (for `Result`/`Result<T>`) and
    `Microsoft.Extensions.Logging.Abstractions` — **no ASP.NET Core, no DB driver, no ORM.**
    Fully unit-testable in isolation.
- **`ElBaul.Infra`** — implements every output port (`BaulRepository`, `AlbumRepository`,
  `PhotoRepository`, `RecuerdoRepository`, `UserRepository` over EF Core; `MinioPhotoStorage`;
  `ExifPhotoDateExtractor`; `SystemClock`; `GuidIdGenerator`; `HttpContextCurrentUserProvider`;
  `OidcUserInfoClient`) and exposes a single composition-root method,
  `ServiceRegistration.AddInfrastructure()`, called once from `Program.cs`. Also owns
  `ElBaulDbContext` + EF Core migrations, and two cross-cutting ASP.NET Core middlewares that
  belong to infra concerns rather than business logic (see below) — this is why `Infra` needs a
  `<FrameworkReference Include="Microsoft.AspNetCore.App" />` despite being otherwise a plain
  class library.
- **`ElBaul.Api`** — thin ASP.NET Core host: controllers, `Program.cs`, auth/rate-limiting/
  Swagger setup, and one-off maintenance CLI commands (`Tools/`). Controllers depend only on
  `Ports/Input` interfaces, never on `Infra` or `Application` concrete types directly.

### Controller conventions

- Thin: one controller per resource area (`BaulesController`, `AlbumsController`,
  `PhotosController`, `UsersController`, `AppConfigController`), delegating to a use-case method
  and mapping the `Result`/`Result<T>` to an HTTP response.
- Errors use `Result.Failure<T>(string)` with a human-readable message; `ErrorMapping.
  ToActionResult` (`api/ElBaul.Api/ErrorMapping.cs`) maps it to a status code by matching
  substrings — `"access denied"` → 403, `"not found"` → 404, everything else → 400. This mirrors
  the way per-message checks worked in the original app it replaced; there's no typed error enum
  yet, so a new failure message needs to contain one of those two phrases (or fall through to
  400) to get the right status code.
- Every endpoint is `[Authorize]` by default, except `AppConfigController` (`[AllowAnonymous]`,
  rate-limited) and `/health`.
- The caller's identity is never a controller parameter — use cases call
  `ICurrentUserProvider.GetUserId()` themselves.

### Auth

- `JwtBearer` validates access tokens. `ValidIssuer`/`Audience` come from config
  (`Auth:ValidIssuer`, `Auth:Audience`); signing keys are fetched directly from a configured
  `Auth:JwksUri` and cached in-process, **not** resolved from the token issuer's discovery
  document. Locally the backend reaches the OIDC provider over the internal Docker network
  (`fake-oidc:5000`), but the token's `iss` claim (and everything in its discovery document) is
  set to the address the *browser* used (`localhost:5000`) — those two are unreachable from each
  other, so `Auth:JwksUri` and `Auth:ValidIssuer` are configured independently instead of letting
  the library auto-discover.
- `UserSyncMiddleware` (`ElBaul.Infra`) just-in-time syncs the local `Users` row for the
  authenticated `sub` claim. OIDC access tokens only carry `sub` (no email/name), and baúl-sharing
  invitations need a local user row to exist, so email/name are fetched from the userinfo
  endpoint the first time a `sub` is seen (or whenever the local row is incomplete) — never on
  every request.
- `UserLogContextMiddleware` (`ElBaul.Api`) pushes the authenticated user id onto Serilog's
  `LogContext` so every log line for a request — including business-event logs from
  `Application/` — carries `{UserId}`, without every call site threading it through explicitly.
- `Application/` use-case code never reads `HttpContext`/claims directly — `UserSyncMiddleware`,
  `UserLogContextMiddleware`, and `HttpContextCurrentUserProvider` are the only places that do.

### Core conventions

- **Every external effect sits behind an output port**: `IClock` (no `DateTime.UtcNow` inline),
  `IIdGenerator` (`GuidIdGenerator`), `ICurrentUserProvider`, `IPhotoStorage`,
  `IPhotoDateExtractor`. This is what makes the `Application/` managers unit-testable against
  hand-written fakes, no mocking framework.
- **Access control is checked explicitly inside each use-case method**, not via a global filter:
  every `AlbumManager`/`PhotoManager`/`BaulManager` method that touches a baúl-scoped resource
  loads the baúl, then checks `baul.CustodioId == userId || sharedUser exists for userId`, and
  returns `Result.Failure<T>("Access denied")` otherwise. This keeps scoping visible at each call
  site (see `AlbumManager.cs` for the canonical shape) at the cost of some repetition across
  managers — there's no shared authorization helper yet.
- **DI lifetimes are `Scoped` by default.** `MinioPhotoStorage` is the one deliberate
  `Singleton` exception, because it wraps a single `AmazonS3Client`, which the AWS SDK documents
  as thread-safe and meant to be reused/pooled across requests — not request state.
- No decorator or null-object patterns are in use yet — infra concerns like `IPhotoStorage`
  compose imgproxy URL-building directly rather than through a wrapping decorator, and the one
  feature flag in the app (`Features:MonetizationEnabled`, surfaced by `AppConfigController`) is
  read straight from `IConfiguration` in the controller rather than switching an implementation
  at the composition root.

### Data access

- **EF Core** over PostgreSQL (`Npgsql.EntityFrameworkCore.PostgreSQL`), chosen for the
  relational, many-to-many-ish shape of baúles/albums/photos/personas. Table/column mapping via
  Fluent API in `EntityConfigurations/` (one file per entity), not data annotations.
- Migrations are applied automatically at startup — `dbContext.Database.MigrateAsync()` in
  `Program.cs` — never a manual deploy step.
- **IDs**: `Guid` primary keys for all domain entities (`Baul`, `Album`, `Photo`, `Recuerdo`,
  `SharedUser`, `RemovalRequest`); `User` is keyed by the OIDC `sub` claim instead, stored as
  opaque `text` (Zitadel/OIDC subject ids aren't guaranteed to be GUID-shaped). DTOs expose ids
  as `string`; controllers parse route ids to `Guid` via `{id:guid}` route constraints.
- **Photos are soft-deleted**: `PhotoStatus.Active`/`Deleted`, driven by the removal-request
  workflow rather than a hard `DELETE`.
- **Photo dates are partial** (`DateYear`/`DateMonth`/`DateDay`, all nullable) — EXIF extraction
  (`ExifPhotoDateExtractor`, via `MetadataExtractor`) fills them in on upload when available, and
  a photo with no date is still valid (`AlbumManager.ComputeDateRange` treats it as "undated"
  rather than defaulting it into a sort position).
- **Timestamps**: `CreatedAt`/`UpdatedAt` on every entity, set via `IClock` (UTC), not DB
  defaults.

### Photo storage & image serving

Uploaded photo bytes live in MinIO (S3-compatible); the API never hands out a MinIO URL or reads
photo bytes back out over HTTP itself:

- `IPhotoStorage.SaveAsync`/`DeleteAsync` write/delete objects in MinIO, keyed by an opaque
  string the `Application` layer chooses.
- `IPhotoStorage.GetImageUrl(key, placement)` returns a signed **imgproxy** URL instead of a raw
  storage URL. `ImgproxyUrlBuilder` (`ElBaul.Infra`) builds `s3://bucket/key` as imgproxy's
  source, maps `ImagePlacement` (`PhotoGridThumbnail`, `PhotoFull`, `AlbumCover`,
  `AlbumCoverFeatured`, `RemovalRequestThumbnail`, `InvitationPreview`, `BaulCover`) to a
  **named preset** configured server-side in `imgproxy/presets.conf`, and HMAC-signs the path
  with a shared key/salt.
- imgproxy is the *only* component that ever reads from MinIO — it holds its own S3 credentials
  and fetches originals directly over the internal Docker network. Because presets are named and
  `IMGPROXY_ONLY_PRESETS` is enabled, a leaked signing key can only request one of the
  pre-configured resize shapes, never an arbitrary render size.
- `IPhotoStorage.OpenReadAsync` (raw bytes) exists only for server-side tooling — e.g. the EXIF
  backfill command — and is never reachable through the API.

### Maintenance commands

`Program.cs` intercepts `args[0]` before starting the web server for one-off maintenance work
(`backfill-exif-dates`, `backfill-recuerdo-album-id`, implemented in `ElBaul.Api/Tools/`). These
run via `docker exec <container> dotnet ElBaul.Api.dll <command>` against an already-running
deployment (see `api/README.md`) — the web process itself never runs them.

### Other conventions

- **Logging**: Serilog, bootstrap console logger before `WebApplication.CreateBuilder`, then
  reconfigured via `ReadFrom.Configuration` + `UseSerilog`. `Serilog.Sinks.Seq` ships alongside
  the console sink; request logging via `UseSerilogRequestLogging()`.
- **API docs**: Swagger/Swashbuckle, enabled only in `Development`.
- **CORS**: `AllowAnyOrigin`/`AllowAnyMethod`/`AllowAnyHeader` — acceptable since auth is bearer
  token, not cookies/origin-based.
- **Rate limiting**: a fixed-window `PublicLimiter` policy, keyed by client IP, applied to
  `/health` and `AppConfigController` — the only unauthenticated endpoints. Config-driven limit,
  structured logging on rejection.
- **Config**: `appsettings.json` (dev defaults committed) + `appsettings.Production.json` +
  environment variables in the container (see `docker-compose.yaml` for the full local env var
  set: `ConnectionStrings__DefaultConnection`, `Auth__*`, `Storage__*`, `Imgproxy__*`). Never
  commit production secrets.

### Testing

- **`ElBaul.Tests`** — core/application logic (`AlbumManagerTests`, `BaulManagerTests`,
  `PhotoManagerTests`) against hand-written fakes in `Fakes/` (`InMemory*Repository`,
  `StaticClock`, `StaticIdGenerator`, `StaticCurrentUserProvider`, `FakePhotoStorage`,
  `FakePhotoDateExtractor`) — no mocking framework, fast, behavior-focused.
- **`ElBaul.Infra.Tests`** — infra-layer units that are cheap to isolate without a real
  MinIO/DB (`ImgproxyUrlBuilderTests`, `UserSyncMiddlewareTests`).

---

## Frontend (`app/src`)

### Layers

```
features/<domain>/components/*Route.tsx  →  store/*  →  api.ts  →  types/index.ts
                    ↓ renders
        app/components/*.tsx  (presentational screens)
```

- **`types/index.ts`** — one class per domain entity (`Baul`, `Album`, `Photo`, `Recuerdo`,
  `SharedUser`, `RemovalRequest`, `BaulPreview`, `UserProfile`, plus value types like
  `PhotoDate`/`Subscription`). Classes so raw JSON can be re-hydrated via `new Entity(data)`.
- **`api.ts`** — a single `api` object, namespaced per resource (`api.baules`, `api.albums`,
  `api.photos`, `api.recuerdos`, `api.sharedUsers`, `api.users`, `api.appConfig`). Plain `fetch`
  through a shared `handleResponse` that throws on non-OK responses; auth token is module-level
  state (`_accessToken`) set via `setAccessToken()`, not read from a hook. Every response is
  mapped back into its `types/index.ts` class before being returned. Base URL from
  `VITE_API_URL`.
- **`store/`** — not a single store; state is split by concern:
  - `useAppStore.ts` — the main domain store (auth-derived profile/subscription, plus all
    server data: `baules`, `albums`, `photos`, `loosePhotos`, `sharedUsers`, `removalRequests`,
    `recuerdos`, `albumRecuerdos`). One `fetchData()` loads baúles on auth; per-screen `load*`
    actions lazy-load the rest (albums, photos, recuerdos) as routes need them, rather than one
    eager `Promise.all` for everything. Every mutating action calls `api.*` first and updates
    state from the response only after the await resolves.
  - `uiStore.ts` — cross-cutting UI state (toasts, profile menu, plan-limit modal) that isn't
    server data and doesn't belong to one screen.
  - `useAppConfigStore.ts` — remote feature flags (`api.appConfig.get()`), fetched once per
    session in `App.tsx` on mount; screens gated by a flag stay off until it resolves.
  - `useIncomingShareStore.ts` — state for the native "share into the app" flow (see Capacitor
    below), independent of server data.
- **`features/<domain>/components/*Route.tsx`** — one container component per route, named
  `*Route` (`AlbumRoute`, `BaulesListRoute`, `CreateBaulRoute`, …), grouped into
  `features/{albums,auth,baules,photos,profile,sharing}/`. A Route component reads
  `useParams`/store state, defines the handlers (calling store actions, navigating, showing
  toasts), and renders a presentational component from `app/components/` with everything passed
  as props — no business logic or store access inside `app/components/`.
- **`app/components/`** — flat directory of presentational screens/modals (`PhotosView`,
  `AlbumsView`, `BaulesList`, `CreateAlbumForm`, `RecuerdoCard`, …) plus small shared primitives
  (`Button`, `Card`, `Input`, `FAB`, `Toast`, `LoadingSpinner`). Props-in, callbacks-out; no
  `useAppStore`/`api` imports.
- **`App.tsx`** — owns routing (`react-router-dom` `<Routes>`, no shared `<Layout>` wrapper —
  each route renders its own screen directly), the auth redirect gate (`react-oidc-context`),
  pushing the access token into `api.ts`, and one-time domain data load
  (`loadUserData`/`fetchData`) whenever auth state changes. Every protected route is wrapped in
  `<ProtectedRoute>`/`<PublicRoute>` (`app/routes/AuthGuards.tsx`), not a layout component.
- **`main.tsx`** — entry point. Wraps `<App />` in a Sentry `ErrorBoundary` (`CrashFallback`),
  `<AuthProvider>` (OIDC config inlined here, including the Zitadel-specific
  `urn:zitadel:iam:org:id:{organizationId}` scope), and `<BrowserRouter>`. Also registers the PWA
  service worker (`vite-plugin-pwa`) and, on native platforms, wires Capacitor deep-link
  callbacks into the OIDC redirect flow.

### Native app (Capacitor) and PWA

The frontend ships as three things from one codebase: a browser SPA, an installable PWA
(`vite-plugin-pwa`, `manifest` in `vite.config.ts`), and a native Android app
(`@capacitor/android`, `app/android/`, `capacitor.config.ts`). Capacitor-specific bits are
isolated rather than spread through the app:

- `native/shareReceiver.ts` + `useIncomingShareStore.ts` handle Android's native
  "share photos into El Baúl" intent.
- `main.tsx` special-cases the OIDC redirect on native: `AppUrlOpen`/launch-URL deep links
  (`studio.ne2.elbaul://…`) are rewritten to the in-app `/callback` route, because
  `react-oidc-context` expects `code`/`state` on the page URL, not an OS-level deep link.
- `npm run android:build` builds with `--mode android` (a separate `.env.android`) and runs
  `cap sync android`.

### Conventions

- **Auth**: `react-oidc-context`. `App.tsx` redirects to sign-in whenever the user isn't
  authenticated and isn't on a public path (`/`, `/invitacion/*`, `/onboarding`); the access
  token is pushed into `api.ts` via `setAccessToken` on every auth state change.
- **Routing**: `react-router-dom` v7, all routes declared flat in `App.tsx`, in Spanish
  (`/baules/:baulId/albumes/:albumId/foto/:photoId`, `/eliminar-solicitudes/:baulId`, …) —
  the domain language ("baúl", "álbum", "recuerdo") is the URL language too.
- **State management**: Zustand only, split by concern as above — no React Context for domain
  data, no server-state library (React Query, SWR).
- **Styling**: Tailwind CSS v4, CSS-first config (`styles/theme.css`/`tailwind.css`, no
  `tailwind.config.js`). Colors/typography are theme tokens sourced from
  [`docs/DESIGN.md`](DESIGN.md) — never raw hex/Tailwind palette classes in components.
- **Error monitoring**: `@sentry/react` (+ `@sentry/capacitor` on native), initialized in
  `sentry.ts`, with a top-level `ErrorBoundary`/`CrashFallback`. `npm run build` never talks to
  Sentry itself — it only stamps deterministic debug ids into `dist/`
  (`sentry-cli sourcemaps inject`); uploading sourcemaps is a separate script
  (`npm run sentry:upload-sourcemaps`) that only CI runs, against the `dist/` extracted from the
  already-built Docker image.
- **TypeScript**: `@/*` path alias maps to `app/src`.
- **Config**: environment-driven via Vite (`VITE_API_URL`, `VITE_OIDC_AUTHORITY`,
  `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_CALLBACK_URI`, `VITE_ZITADEL_ORGANIZATION_ID`,
  `VITE_SENTRY_DSN`), baked in at build time as Docker build args (see `docker-compose.yaml` and
  `frontend-deploy.yml`).
- **No shared package/types** between frontend and backend — DTO shapes are duplicated by hand
  (backend `Ports/Input/*Dto.cs` vs. `types/index.ts` classes) and kept in sync manually; the
  intended contract is documented in [`docs/API.md`](API.md).

---

## Cross-cutting / deployment

- **CI/CD**: three independent, path-filtered GitHub Actions workflows —
  `backend-deploy.yml` (`api/**`), `frontend-deploy.yml` (`app/**`), `imgproxy-deploy.yml`
  (`imgproxy/**`) — each triggered only by pushes to `main` that touch its own directory. All
  three: build → (backend also runs `dotnet test`) → build a Docker image → push to GHCR
  (`ghcr.io/<repo>-api`, `-app`, `-imgproxy`) → trigger a Coolify deploy webhook. The frontend
  workflow additionally extracts `dist/` from the just-built image afterward and uploads its
  sourcemaps to Sentry (see above) — a step that needs Node/npm, not the Docker image.
- **Containers**: backend is a multi-stage .NET SDK→ASP.NET runtime image exposing port 8080.
  Frontend is built by Vite inside its own Dockerfile build stage (VITE_* build args baked in),
  then the static `dist/` is served by `nginx:alpine` (port 80) with SPA-fallback
  `nginx.conf`. imgproxy has its own minimal `Dockerfile`/`presets.conf`.
- **Local dev**: `docker-compose.yaml` at the repo root runs Postgres, MinIO, imgproxy,
  [fake-oidc](https://github.com/ne2-studio/fake-oidc) (a throwaway OIDC provider — no login UI,
  users selected via `login_hint`), the API, and the frontend, each built from its own
  Dockerfile — see the root [`README.md`](../README.md) for the full flow and ports.
