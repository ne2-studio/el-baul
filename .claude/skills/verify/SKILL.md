---
name: verify
description: "Verifies a backend or frontend change in El Baúl actually works: dotnet test for backend logic, a live check against the running stack (via the `run` skill) for anything user-facing. Use before considering backend or frontend work in this repo done — especially UI changes, which this repo has a specific way of silently lying to you about."
---

## Goal

"The tests pass" and "the diff looks right" are not verification here — this repo has
a specific, repeatable way to fool you into thinking a UI change didn't work when it
actually did (or vice versa). Read "The stale-container trap" before verifying
anything user-facing.

## Backend changes

```bash
cd api
dotnet test   # ElBaul.slnx: ElBaul.Tests, ElBaul.Infra.Tests, ElBaul.Api.Tests
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

For anything in `ElBaul.Api/Tools/` (one-off maintenance commands like
`backfill-*`): these are **untested by convention** — `BackfillExifDatesCommand` has
zero unit tests, and new ones follow the same pattern. Real verification is running it
against the live container (see the `run` skill to bring the stack up):

```bash
docker compose exec api dotnet ElBaul.Api.dll <command> --dry-run   # reports, changes nothing
docker compose exec api dotnet ElBaul.Api.dll <command>             # applies it
docker compose exec api dotnet ElBaul.Api.dll <command> --dry-run   # re-run: should report 0 candidates
```

That third run matters — it's what proves the command is idempotent/safe to re-run in
production, which is the whole point of these commands.

## Frontend changes

```bash
cd app && npm run typecheck            # tsc --noEmit — fast, catches type errors, run always
cd app && npm run test:image-acceptance  # behavioral coverage — photos, personas, removal requests
cd app && npm run test:e2e             # login + reach the real home screen, against the full real stack
```

**Run `test:image-acceptance` before considering done any change touching photo
upload/move/delete, persona invite/role-change/revoke, or removal-request
submit/approve/reject** — that's exactly the coverage those four specs give
(`app/e2e-image-acceptance/`, see the `run` skill's section 4b for the two images it needs
built first). It's real regression protection for a broken store action or route wiring, not
a rubber stamp, and markedly faster than `test:e2e` since there's no real Postgres/MinIO/
imgproxy to boot. It does **not** cover anything outside those four flows.

`test:e2e` (`app/e2e/smoke.spec.ts`, see the `run` skill's section 4a) boots the full
docker-compose stack itself and confirms the login → home path still works against **real**
infra — the one check here that actually exercises Postgres/MinIO/imgproxy wiring, not just
application code. Run it for anything touching that wiring specifically (it's also covered
automatically by the nightly CI job regardless).

For anything UI-facing beyond what these two suites cover, load the `run` skill, get a
logged-in browser, and actually drive to the changed screen. Prefer the Vite dev server flow
in that skill over the docker `app` container for this — see below.

## The stale-container trap

This is the one lesson worth internalizing before you verify anything visual here.

**What happened**: a backend fix (`ChapterDto.RecuerdoCount`) was correct — confirmed via
`dotnet test` and a raw `curl` against the API. But the chapter card in the browser
still showed no recuerdo count, twice in a row, across two "fix and re-verify" cycles.
The actual cause: the docker-compose `app` container (serving a `dist/` built *before*
the frontend change) was still bound to port 3000 the whole time, un-torn-down from an
earlier session. A `Vite` dev server started alongside it silently bound to **3001**
instead (port 3000 was taken) and was never actually the thing being looked at.

**Why it's easy to fall into**: the browser at `localhost:3000` looked completely
normal — real data, real login, no errors. Nothing about the *symptom* pointed at
"wrong container"; it looked exactly like "my frontend fix is wrong."

**The check that resolves it in seconds, every time:**

1. `docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' | grep el-baul` —
   is `el-baul-app-1` (the prebuilt-dist container) actually up on `:3000`? If yes,
   that's what you're looking at, not your dev server.
2. If you started a dev server, re-read its **own startup log** for the port it
   actually bound to (`Local: http://localhost:XXXX/`) — don't assume it got the port
   you asked for. Use `--strictPort` to fail loudly instead of silently picking
   another one (see the `run` skill).
3. When in doubt, get the ground truth straight from the API instead of the rendered
   page: extract the bearer token from the browser's `localStorage` (see the `run`
   skill, step 5) and `curl` the endpoint directly. If the JSON already has the right
   shape, the backend is done and any remaining bug is in what's being served or how
   it's rendered — that distinction alone tells you where to keep looking.

Run the `docker ps` check as step 0 of *every* verification session in this repo, not
just when something looks wrong — it's cheap and it's the thing that was skipped both
times this actually bit.

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
before driving anything non-trivial. Filter out `:8081/` (imgproxy) 4xx noise
separately — this local stack's seeded photos frequently reference storage keys with
no matching MinIO object, which is a pre-existing data-seeding gap, not a code bug.
