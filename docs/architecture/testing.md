# Testing strategy

Choose the smallest test that can detect the failure.

| Change | Primary verification |
|---|---|
| Backend application/domain logic | `api/ElBaul.Tests` (unit, fake-first, NSubstitute for narrow seams) |
| Backend infra-layer logic (URL building, middleware) | `api/ElBaul.Infra.Tests` |
| Backend controller/authorization concerns | `api/ElBaul.Api.Tests` |
| Backend maintenance command logic | `api/ElBaul.Maintenance.Tests` |
| Backend domain model, persistence, or public API contract | + `api/acceptance-tests` |
| Frontend pure logic (mappers, formatters, reducers) | Vitest, `environment: 'node'` (default) |
| Frontend component/hook behavior | Vitest + jsdom + React Testing Library |
| Frontend journey: photo/persona/removal-request flows | `app/acceptance-tests/` (against `el-baul-api-lite`) |
| Whole-stack wiring (login → home against real infra) | root `/e2e-tests/` |

## Canonical Commands

Run verification from the repository root through `./scripts/verify`:

| Command | Coverage |
|---|---|
| `./scripts/verify backend` | Restore, Release build, and Release `--no-build` tests for `api/ElBaul.slnx` |
| `./scripts/verify backend-acceptance` | Fresh real backend Docker image + `api/acceptance-tests` |
| `./scripts/verify frontend` | Consumer app TypeScript check + Vitest |
| `./scripts/verify admin` | Admin TypeScript check + Vitest |
| `./scripts/verify frontend-acceptance` | Fresh consumer app image + fresh `el-baul-api-lite` image + `app/acceptance-tests` |
| `./scripts/verify e2e` | Root `e2e-tests` smoke against the real `docker-compose.yaml` stack |
| `./scripts/verify all` | Complete local verification: every command above |

## Backend

- **`ElBaul.Tests`** — `Application/` business logic with hand-written fakes as the default.
  Most state-bearing fakes live in `ElBaul.Infra.Lite` (`InMemory*Repository` and related
  collaborators) — they're the same classes that back `el-baul-api-lite`, so a unit test and the
  lite image can never quietly disagree on what a fake does. Test-local fakes live under
  `ElBaul.Tests/Fakes` for deterministic ports such as storage, clocks, IDs, and external
  services.
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
- **`api/acceptance-tests/`** — a separate solution (excluded from `ElBaul.slnx` — plain
  `dotnet test` does not run it). Black-box acceptance tests for the *built Docker image*, run
  via Testcontainers against a real Postgres + MinIO + fake-oidc stack: no `ProjectReference` to
  anything above, no shared fixtures/DTOs. Runs in CI right after `docker build`, before the
  image is pushed. Run it for any change to the domain model, persistence, or the public API
  contract — the unit suites mostly run against hand-written fakes and can't catch an EF model
  that fails to build against a real Postgres, or a wire-format regression a DTO recompiled
  against itself can't reveal.

  Run with `./scripts/verify backend-acceptance`.

  See `api/acceptance-tests/README.md` for its own rule set.

## Frontend

Three levels — see [`../adr/0001-frontend-testing-strategy.md`](../adr/0001-frontend-testing-strategy.md)
for the full rationale.

- **Unit** (Vitest, `environment: 'node'`, the config default, run by
  `./scripts/verify frontend`) — narrow, in-process,
  no DOM: store logic, utils.
- **Component** (Vitest + jsdom + React Testing Library, opted in per-file via a
  `// @vitest-environment jsdom` docblock) — components/hooks needing a real DOM. Query
  priority: role/label/placeholder/text before `data-testid`.
- **`app/acceptance-tests/`** (`./scripts/verify frontend-acceptance`) — behavioral-regression Playwright against the built
  frontend image + `el-baul-api-lite` (see [`../operations/api-lite.md`](../operations/api-lite.md)),
  no real Postgres/MinIO/imgproxy to boot. Covers photo upload/move/delete, persona
  invite/role-change/revoke, and removal-request submit/approve/reject. Gates
  `frontend-deploy.yml`. Some flows need a second identity (a second browser context logged in
  as a different fake-oidc user), since the backend rejects an account accepting its own invite
  and only shows "submit removal request" to a non-admin member.

## Whole-system

- **`/e2e-tests/`** (`./scripts/verify e2e`) — full-stack Playwright
  against the real `docker-compose.yaml` stack (Postgres, MinIO, imgproxy, fake-oidc). Lives
  outside `app/` because it exercises the whole repo, not just the frontend. Runs nightly,
  decoupled from any deploy — exercise only critical wiring here, not behavioral coverage that
  belongs in `app/acceptance-tests/`.
