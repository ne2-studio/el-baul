# ElBaul.Infra.PersistenceTests

Tests the real EF Core adapters in `ElBaul.Infra/Persistence` — and, where the only reason a
bug would exist is real database behavior, the thin `Application/` orchestrators built on top
of them — directly through their port interfaces (`IAdminRepository`, `IBaulRepository`, ...),
against one real, migrated Postgres container (Testcontainers), reset to empty between tests.

## What this project is for — and, as importantly, what it isn't

**It does not test business logic, and it is not a second `ElBaul.Tests`.** Almost every
repository method is already covered there, cheaply, against `ElBaul.Infra.Lite`'s
hand-written in-memory fakes — that stays the default, and stays the right choice for anything
a fake can faithfully reproduce.

This project exists only for the narrow class of bug an in-memory fake **cannot** reproduce,
because it isn't running SQL against a real relational engine at all:

- **EF query translation.** `GroupBy`/`Join`/`Distinct`/`SumAsync` chains that must run
  server-side as SQL, including the specific trap of a LINQ expression referencing a C#-only
  computed property (`Persona.IsClaimed`) that EF simply cannot translate. A fake backed by
  `List<T>.Where(...)` runs that same C# predicate happily — it can't fail the way the real
  adapter can, so it can't catch a regression here.
- **Real foreign-key behavior.** An infrastructure deletion adapter that issues several
  repository calls in a specific order to satisfy Postgres `Restrict` FKs.
  The in-memory fakes enforce no referential integrity at all, so a reordering that would raise
  a live FK violation — or silently orphan a row — passes there unnoticed.

If a test here would pass or fail identically against an in-memory fake, it belongs in
`ElBaul.Tests` instead, not here. Before adding a test to this project, be able to name the
real-Postgres-only behavior it exists to catch — the way each existing test's doc comment does.

## Why not `api/acceptance-tests`?

`api/acceptance-tests` also runs against a real Postgres, but treats the backend as an opaque
Docker image, reachable only over HTTP: it exists to catch a break in the built artifact's wire
contract, not to pinpoint which repository method mistranslated a query. Routing an EF
query-translation bug through OIDC token exchange, HTTP auth, controller model binding, and a
`Manager` just to observe it via a JSON response body adds a large surface that can just as
easily mask the bug (or fail for an unrelated reason) as reveal it — and it isn't what that
project is for either; see its own README's "no second copy of the domain test suite" rule.
This project calls the real adapter directly, so a failure here points at the adapter itself.

## How it's structured

- **`PostgresFixture`** — an `ICollectionFixture` shared by every test class in
  `PersistenceTestCollection`: one Postgres container, migrated once per test run (starting a
  container and running migrations is the expensive part). `ResetAsync()` truncates every
  `ElBaulDbContext` table between tests, so each test starts from a genuinely empty database
  instead of relying on unique ids or before/after deltas to dodge other tests' rows.
- **`PersistenceTestBase`** — resets the database in `IAsyncLifetime.InitializeAsync()`, which
  xunit runs before every test method (it constructs a fresh test class instance per `[Fact]`).
  Every test class inherits from this instead of implementing `IAsyncLifetime` by hand.
- Every test class also carries `[Collection(PersistenceTestCollection.Name)]` — this is what
  actually shares the fixture and serializes these tests against the one container; xunit does
  not reliably honor a `[Collection]` attribute inherited from `PersistenceTestBase` alone.
- Tests construct the real repository/manager classes directly (`new AdminRepository(dbContext)`,
  `new AdminBaulDeletionRepository(...)`, `new AdminManager(...)`), wiring in other real repositories for setup and only substituting
  (via NSubstitute) the collaborators that have nothing to do with Postgres — storage, chat
  context, the clock — mirroring `ElBaul.Tests`' own "NSubstitute for narrow seams" convention.

## Running

`./scripts/verify backend-persistence` from the repository root. Requires a running Docker
daemon (Testcontainers talks to it directly, same as `api/acceptance-tests`).
