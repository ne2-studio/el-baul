# Testing strategy

Choose the smallest test that can detect the failure.

| Change | Primary verification |
|---|---|
| Backend application/domain logic | `api/ElBaul.Tests` (unit, fake-first, NSubstitute for narrow seams) |
| `Ne2Studio.Common` vocabulary (`Result`/`ApplicationError`) | `api/Ne2Studio.Common.Tests` |
| Backend infra-layer logic (URL building, middleware) | `api/ElBaul.Infra.Tests` |
| Backend controller/authorization concerns | `api/ElBaul.Api.Tests` |
| Backend maintenance command logic | `api/ElBaul.Maintenance.Tests` |
| Backend repository/adapter behavior only a real Postgres can catch (EF query translation, FK-Restrict ordering) | `api/ElBaul.Infra.PersistenceTests` |
| Backend domain model or public API contract | + `api/acceptance-tests` |
| Frontend pure logic (mappers, formatters, reducers, use cases) | Vitest, `environment: 'node'` (default) |
| Frontend component/hook behavior | Vitest + jsdom + React Testing Library |
| Frontend isolated Storybook contracts | Storybook Vitest addon, Vitest browser mode, Playwright Chromium |
| Frontend journey: photo/persona/removal-request flows | `app/acceptance-tests/` (against `el-baul-api-lite`) |
| Admin journey: login and dashboard access | `admin/acceptance-tests/` (against `el-baul-api-lite`) |
| Whole-stack wiring (login → home against real infra) | root `/e2e-tests/` |

## Canonical Commands

Run verification from the repository root through `./scripts/verify`:

| Command | Coverage |
|---|---|
| `./scripts/verify backend` | Restore, Release build, and Release `--no-build` tests for `api/ElBaul.slnx` |
| `./scripts/verify backend-persistence` | `api/ElBaul.Infra.PersistenceTests` against a real, migrated Postgres (Testcontainers) |
| `./scripts/verify backend-acceptance` | Fresh real backend Docker image + `api/acceptance-tests` |
| `./scripts/verify frontend` | Consumer app TypeScript check + ESLint + Vitest unit/component tests + Storybook executable specs |
| `./scripts/verify admin` | Admin TypeScript check + Vitest |
| `./scripts/verify frontend-acceptance` | Fresh consumer app image + fresh `el-baul-api-lite` image + `app/acceptance-tests` |
| `./scripts/verify admin-acceptance` | Fresh admin image + fresh `el-baul-api-lite` image + `admin/acceptance-tests` |
| `./scripts/verify e2e` | Root `e2e-tests` smoke against the real `docker-compose.yaml` stack |
| `./scripts/verify all` | Complete local verification: every command above |

## Backend

- **`ElBaul.Tests`** — `Application/` business logic with hand-written fakes as the default.
  Most state-bearing fakes live in `ElBaul.Infra.Lite` (`InMemory*Repository` and related
  collaborators) — they're the same classes that back `el-baul-api-lite`, so a unit test and the
  lite image can never quietly disagree on what a fake does. Test-local fakes live under
  `ElBaul.Tests/Fakes` for deterministic ports such as storage, clocks, IDs, and external
  services.
- **`Ne2Studio.Common.Tests`** — unit tests for `Ne2Studio.Common` itself (`Result`/
  `ApplicationError`), kept in their own project since `Ne2Studio.Common` has no dependency on
  `ElBaul` and shouldn't gain one just to be tested.
- Use **NSubstitute** only for narrow cases where a full fake would add noise: injecting a
  specific collaborator failure into an otherwise working flow (for example upload rollback
  tests), or stubbing a single method on a dependency whose full behavior is tested elsewhere
  (for example `IChatContextBuilder` in chat orchestration and suggested-question tests).
- **`ElBaul.Infra.Tests`** — infra-layer units cheap to isolate without a real MinIO/DB.
  Includes approval tests (`Verify.Xunit`) for email templates, which snapshot full rendered
  output against a committed baseline — a mismatch writes a `.received.txt` next to it for
  diffing; re-approve an intentional change by reviewing and overwriting the `.verified.txt`.
- **`ElBaul.Api.Tests`** — concerns that need the ASP.NET pipeline itself (authorization
  policies), not just the `Application/` logic behind it.
- **`ElBaul.Maintenance.Tests`** — one-off maintenance command behavior with the same
  fake-first convention as `ElBaul.Tests`: use `ElBaul.Infra.Lite`'s `InMemory*Repository`
  implementations for stateful ports and small test-local fakes for deterministic storage,
  clocks, extractors, or provider failures.
- **`ElBaul.Infra.PersistenceTests`** — a separate project, excluded from `ElBaul.slnx` since it
  needs a running Docker daemon that `./scripts/verify backend` deliberately doesn't require.
  Runs the real EF repository/adapter classes directly through their port interfaces
  (`IAdminRepository`, `IBaulRepository`, ...) against one real, migrated Postgres container
  (Testcontainers), reset to empty between tests. Deliberately **not** a second `ElBaul.Tests`:
  it exists only for the narrow class of bug an in-memory fake structurally cannot reproduce —
  EF query translation into SQL (`GroupBy`/`Join`/`Distinct`/computed properties that don't
  translate) and real Postgres FK-Restrict ordering. Most repository logic should stay covered
  by `ElBaul.Tests`' fakes; add a test here only when you can name the real-Postgres-only
  behavior a fake would let through.

  Run with `./scripts/verify backend-persistence`. See
  `api/ElBaul.Infra.PersistenceTests/README.md`.
- **`api/acceptance-tests/`** — a separate solution (excluded from `ElBaul.slnx` — plain
  `dotnet test` does not run it). Black-box acceptance tests for the *built Docker image*, run
  via Testcontainers against a real Postgres + MinIO + fake-oidc stack: no `ProjectReference` to
  anything above, no shared fixtures/DTOs. Runs in CI right after `docker build`, before the
  image is pushed. Run it for any change to the domain model or the public API contract — the
  unit suites mostly run against hand-written fakes and can't catch an EF model that fails to
  build against a real Postgres, or a wire-format regression a DTO recompiled against itself
  can't reveal. It is not the place to cover a repository's own query logic or FK-ordering
  behavior — see `ElBaul.Infra.PersistenceTests` above for that.

  Run with `./scripts/verify backend-acceptance`.

  See `api/acceptance-tests/README.md` for its own rule set.

## Frontend

Three levels — see [`../adr/0001-frontend-testing-strategy.md`](../adr/0001-frontend-testing-strategy.md)
for the full rationale.

- **Unit** (Vitest project `unit`, `environment: 'node'`, run by
  `./scripts/verify frontend`) — narrow, in-process,
  no DOM: store logic, utils.
- **Component** (Vitest + jsdom + React Testing Library, opted in per-file via a
  `// @vitest-environment jsdom` docblock) — components/hooks needing a real DOM. Query
  priority: role/label/placeholder/text before `data-testid`.
- **Storybook executable specs** (`npm --prefix app run test:storybook`, also run by
  `./scripts/verify frontend`) — Storybook stories transformed into Vitest tests by
  `@storybook/addon-vitest` and executed in Playwright Chromium browser mode. Every eligible
  story must render. Stories with `play` functions also execute their interaction assertions:
  modal dismissal, form validation/submission, selector state, destructive confirmation, and
  other isolated component/pattern contracts. These tests run before any frontend Docker image is
  built; a render, interaction, assertion, or browser-mode failure blocks merge/deploy.

  Full run takes ~2 minutes (93 files) since it boots one Chromium instance per suite run. For
  local iteration, `npm --prefix app run test:storybook:changed` (`vitest --changed`) runs only
  the stories affected by uncommitted changes via the module graph — seconds instead of minutes.
  It's a dev-loop convenience only: `./scripts/verify frontend` (full `test:storybook`) is still
  the canonical command and the only one that counts as verification evidence — CI always runs
  the full suite, unfiltered.
- **`app/acceptance-tests/`** (`./scripts/verify frontend-acceptance`) — behavioral-regression Playwright against the built
  frontend image + `el-baul-api-lite` (see [`../operations/api-lite.md`](../operations/api-lite.md)),
  no real Postgres/MinIO/imgproxy to boot. Covers photo upload/move/delete, the global baúl
  invite link, persona role-change/revoke, and removal-request submit/approve/reject. Gates
  `frontend-deploy.yml`. Some flows need a second identity (a second browser context logged in
  as a different fake-oidc user) to join a baúl as a genuinely different account, and only
  shows "submit removal request" to a non-admin member.
  Keep these after Docker image build: unlike Storybook specs, they validate the packaged app,
  routing, runtime configuration and API-lite integration rather than isolated source-level UI
  contracts.
- **`admin/acceptance-tests/`** (`./scripts/verify admin-acceptance`) — Playwright against the
  built admin image + the same `el-baul-api-lite` stack. It intentionally starts with a narrow
  surface: unauthenticated redirect to fake-oidc, admin login, and navigating to `/dashboard`.
  Gates `admin-deploy.yml`.

## Whole-system

- **`/e2e-tests/`** (`./scripts/verify e2e`) — full-stack Playwright
  against the real `docker-compose.yaml` stack (Postgres, MinIO, imgproxy, fake-oidc). Lives
  outside `app/` because it exercises the whole repo, not just the frontend. Runs nightly,
  decoupled from any deploy — exercise only critical wiring here, not behavioral coverage that
  belongs in `app/acceptance-tests/`.
