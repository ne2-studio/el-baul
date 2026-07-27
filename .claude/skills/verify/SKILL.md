---
name: verify
description: "Verifies backend and frontend changes using automated tests and, when required, a live environment provided by the run skill. Use before considering implementation work complete."
---

## Goal

"The tests pass" and "the diff looks right" are not always enough verification here.
Use the checks below according to the surface area of the change.

## Backend changes

```bash
cd api
dotnet test   # ElBaul.slnx: unit/API/infra/maintenance tests
dotnet build  # whole solution, compile-only sanity
```

That's real coverage for `Application/` logic (managers), not a rubber stamp — the
fakes in `ElBaul.Tests/Fakes/` are proper in-memory implementations of the output
ports, and this suite has caught real bugs (see "Known sharp edges" below). But it's
coverage against **fakes**, which structurally cannot catch: an EF model/mapping that
fails against a real Postgres, a query that fails to translate to SQL, a wire-format
regression the backend's own DTOs wouldn't reveal, or anything only reachable through a
real container (raw SQL, migrations, the built image's env-var contract).

**Any change to the domain model, persistence (entities, EF configuration, migrations,
value converters), or the public API contract is not verified until `docker-image-tests`
has also passed against the actual built image** — this is a separate solution
(`docker-image-tests/ElBaul.ImageTests.slnx`, not part of `ElBaul.slnx`), so
`dotnet test` above does **not** run it:

```bash
cd api
docker build -t el-baul-api:local .
BACKEND_IMAGE=el-baul-api:local dotnet test docker-image-tests/ElBaul.ImageTests.slnx
```

This spins up real Postgres + MinIO + fake-oidc via Testcontainers and drives the image
through Smoke / InfrastructureCompatibility / CriticalJourneys checks (full
create-baúl → chapter → upload-photo → download-same-bytes → recuerdo journey included).
It's what actually caught, for example, an EF Core limitation where an optional/nullable
complex property compiled fine and passed every fake-backed unit test but threw at
startup against real Postgres — `dotnet test ElBaul.Tests` alone would have shipped it.
See [`docker-image-tests/README.md`](../../api/docker-image-tests/README.md) for what
each test group covers.

For anything in `ElBaul.Maintenance/Commands/` (one-off maintenance commands like
`backfill-*`): add or update unit coverage in `ElBaul.Maintenance.Tests`, and then
verify the command against the live container when the change touches real persistence,
storage, external providers, or deploy-order behavior (see the `run` skill to bring
the stack up):

```bash
docker compose exec api dotnet ElBaul.Maintenance.dll <command> --dry-run   # reports, changes nothing
docker compose exec api dotnet ElBaul.Maintenance.dll <command>             # applies it
docker compose exec api dotnet ElBaul.Maintenance.dll <command> --dry-run   # re-run: should report 0 candidates
```

That third run matters — it's what proves the command is idempotent/safe to re-run in
production, which is the whole point of these commands.

## Frontend changes

```bash
cd app && npm run typecheck   # tsc --noEmit — fast, catches type errors, run always
cd app && npm test            # Vitest — unit/component/store coverage
cd app && npm run test:e2e    # behavioral coverage — photos, personas, removal requests
cd e2e-tests && npm run test:e2e  # login + reach the real home screen, against the full real stack
```

Two different packages, each with its own `test:e2e` script — don't confuse them.

**Run `app`'s `test:e2e` before considering done any change touching photo
upload/move/delete, persona invite/role-change/revoke, or removal-request
submit/approve/reject** — that's exactly the coverage those four specs give
(`app/e2e/`, see the `run` skill's section 4b for the two images it needs
built first). It's real regression protection for a broken store action or route wiring, not
a rubber stamp, and markedly faster than `e2e-tests`' `test:e2e` since there's no real
Postgres/MinIO/imgproxy to boot. It does **not** cover anything outside those four flows.

`e2e-tests`' `test:e2e` (`e2e-tests/smoke.spec.ts`, see the `run` skill's section 4a, a
repo-root package separate from `app/` since it exercises the whole stack) boots the full
docker-compose stack itself and confirms the login → home path still works against **real**
infra — the one check here that actually exercises Postgres/MinIO/imgproxy wiring, not just
application code. Run it for anything touching that wiring specifically (it's also covered
automatically by the nightly CI job regardless).

For anything UI-facing beyond what these two suites cover, invoke the `run` skill, use
the exact URL it returns, and actually drive to the changed screen. Do not start an
additional frontend server manually.

## Known sharp edges (things that have actually broken here)

- **Denormalized counts drift from their source of truth.** `Recuerdo.ChapterId` exists
  specifically so chapter-scoped queries don't need to join through `Photo` — but
  `ChapterManager.ToDtoAsync`'s `RecuerdoCount` was still computed the old way (joining
  through the chapter's *currently active* photos) after that field was added, so it
  silently dropped photo-less recuerdos and any recuerdo whose photo had since been
  soft-deleted. If you're computing a count/aggregate that has a "cheap" denormalized
  field available, grep for other places computing the same logical value the old way
  before assuming a fix is complete.
- **Access-level asymmetry.** `BaulManager` used to compute the Persona count only
  when the caller was the custodio, defaulting to `0` otherwise — so a baúl shown to a
  non-owning member always looked memberless. When a value depends on "am I the
  custodio," check every call site computes it the same way, not just the one you're
  looking at.
- **EF Core model changes that only fail against a real database.** Introducing a
  `PhotoDate` value object initially mapped it as an EF Core `ComplexProperty` on a
  nullable `Photo.Date` — compiled clean, and all 194 `ElBaul.Tests` (fakes, no EF
  involved) passed. The container crashed on startup: EF Core doesn't support optional/
  nullable complex properties at all (dotnet/efcore#31376), and separately, a positional
  record's primary constructor can't bind a complex-type parameter in the first place —
  both are model-validation/materialization failures that only surface when
  `OnModelCreating` actually runs against a real `DbContext`, which no fake-backed test
  ever does. `docker-image-tests` (or just running the built image against real Postgres)
  is what caught it; `dotnet test` alone would have looked green and shipped.

## Playwright verification pattern

Standard shape once you're driving the browser (see the `run` skill for getting a
handle and extracting a token): navigate → act → `page.screenshot({ path, fullPage:
true })` → actually **read the screenshot** (don't infer success from absence of a
thrown error). `page.on('pageerror', ...)` and `page.on('response', r => r.status() >=
400 && ...)` catch client exceptions and failed requests respectively — wire both up
before driving anything non-trivial. Treat unexpected HTTP failures from any service,
including imgproxy, as a real verification failure unless the scenario is explicitly
testing an error path.
