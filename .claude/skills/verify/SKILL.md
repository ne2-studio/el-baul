---
name: verify
description: "Verifies backend and frontend changes using automated tests and, when required, a live environment provided by the run skill. Use before considering implementation work complete."
---

## Goal

"The tests pass" and "the diff looks right" are not always enough verification here.
Use the checks below according to the surface area of the change.

## Backend changes

```bash
./scripts/verify backend-unit
```

That's real coverage for `Application/` logic (managers), not a rubber stamp — the
fakes in `ElBaul.Tests/Fakes/` are proper in-memory implementations of the output
ports. But it's coverage against **fakes**, which structurally cannot catch: an EF
model/mapping that fails against a real Postgres, a query that fails to translate to SQL, a
wire-format regression the backend's own DTOs wouldn't reveal, or anything only reachable
through a real container (raw SQL, migrations, the built image's env-var contract).

**Any change to the domain model, persistence (entities, EF configuration, migrations,
value converters), or the public API contract is not verified until `acceptance-tests`
has also passed against the actual built image** — this is a separate solution
(`acceptance-tests/ElBaul.AcceptanceTests.slnx`, not part of `ElBaul.slnx`), so
`backend-unit` does **not** run it:

```bash
./scripts/verify backend-acceptance
```

This spins up real Postgres + MinIO + fake-oidc via Testcontainers and drives the image
through Smoke / InfrastructureCompatibility / CriticalJourneys checks (full
create-baúl → chapter → upload-photo → download-same-bytes → recuerdo journey included).
It's what actually caught, for example, an EF Core limitation where an optional/nullable
complex property compiled fine and passed every fake-backed unit test but threw at
startup against real Postgres — `dotnet test ElBaul.Tests` alone would have shipped it.
See [`acceptance-tests/README.md`](../../../api/acceptance-tests/README.md) for what
each test group covers.

`backend-acceptance` builds the backend image locally with a fresh verification tag before
running the acceptance tests, removes any existing local image with that tag first, and removes the
verification image afterward unless `KEEP_VERIFY_IMAGES=1` is set.

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
./scripts/verify frontend-unit
./scripts/verify admin-unit
./scripts/verify frontend-acceptance
./scripts/verify e2e
```

`frontend-unit` covers the consumer app TypeScript check and Vitest unit/component/store
tests. `admin-unit` covers the backoffice TypeScript check and Vitest tests.

**Run `frontend-acceptance` before considering done any change touching photo
upload/move/delete, persona invite/role-change/revoke, or removal-request
submit/approve/reject** — that's exactly the coverage those four specs give
(`app/acceptance-tests/`). It builds fresh consumer-app and `el-baul-api-lite` images, runs Playwright
against `docker-compose.lite.yml`, and cleans up the compose stack and verification images.
It's real regression protection for a broken store action or route wiring, not a rubber stamp,
and markedly faster than `e2e` since there's no real Postgres/MinIO/imgproxy to boot. It does
**not** cover anything outside those four flows.

`e2e` (`e2e-tests/smoke.spec.ts`, a repo-root package separate from `app/` since it exercises
the whole stack) boots the full docker-compose stack itself and confirms the login → home path
still works against **real** infra — the one check here that actually exercises
Postgres/MinIO/imgproxy wiring, not just application code. Run it for anything touching that
wiring specifically (it's also covered automatically by the nightly CI job regardless).

For anything UI-facing beyond what these two suites cover, invoke the `run` skill, use
the exact URL it returns, and actually drive to the changed screen. Do not start an
additional frontend server manually.

## Playwright verification pattern

Standard shape once you're driving the browser (see the `run` skill for getting a
handle and extracting a token): navigate → act → `page.screenshot({ path, fullPage:
true })` → actually **read the screenshot** (don't infer success from absence of a
thrown error). `page.on('pageerror', ...)` and `page.on('response', r => r.status() >=
400 && ...)` catch client exceptions and failed requests respectively — wire both up
before driving anything non-trivial. Treat unexpected HTTP failures from any service,
including imgproxy, as a real verification failure unless the scenario is explicitly
testing an error path.
