---
name: implement-mvp
description: "Runs the full PRD → CONTRACT → Ports → implementation pipeline: reads docs/PRD.md and turns the repo into a working MVP that satisfies both the PRD and docs/ARCHITECTURE.md, by chaining the `contract` and `ports` skills before writing Application/Infra/Api (and frontend) code. Use it when the user asks to implement the MVP, bootstrap the app from the PRD, or build the product end to end."
---

## Goal

Go from `docs/PRD.md` to a working, hexagonal-architecture-compliant MVP: use cases
defined, ports formalized, then implemented — backend (`Application/`, `.Infra`,
`.Api`) and, if the PRD implies a UI, frontend — using the repo's own reference
implementation and `docs/ARCHITECTURE.md` as the pattern to follow. This skill
orchestrates the two earlier skills; don't re-derive their logic inline, invoke them.

This is a large, multi-phase task. Track it with `TaskCreate`/`TaskUpdate` — one task
per phase below, plus one per use case during the implementation phase — rather than
holding progress only in your head.

## Prerequisites

- `docs/PRD.md` must exist. If it doesn't, stop and ask the user for it — don't invent
  product requirements.
- Re-read `docs/ARCHITECTURE.md` fresh at the start — it's the standing source of truth
  for layering, naming, and conventions, and it can evolve independently of this skill.

## Phase 1 — Contract

Invoke the `contract` skill. It reads `docs/PRD.md` and produces/updates
`docs/CONTRACT.md` (the use cases as Input/Output/Errors/Rules mini-specs). Don't
proceed until `docs/CONTRACT.md` reflects the full PRD — if the skill flags ambiguities
or TODOs, resolve what you reasonably can from the PRD and ask the user about the rest
before moving on; unresolved business rules compound into wrong ports and wrong code.

## Phase 2 — Ports

Invoke the `ports` skill. It reads `docs/CONTRACT.md` and produces the `Ports/Input`
and `Ports/Output` `.cs` interfaces/DTOs/records in the backend core project. Don't
proceed until every use case in CONTRACT.md maps to a primary port method and every
capability it needs has a secondary port.

## Phase 3 — Implementation plan

Before writing code, work out, per primary port method:
- Which secondary ports it calls and in what order (you already did a lighter version
  of this walkthrough in the `ports` skill — now extend it to every use case, not just
  the two most rule-heavy ones).
- Which persisted entities/tables are needed, and whether the domain is simple/CRUD-shaped
  (→ Dapper + FluentMigrator, per `ARCHITECTURE.md`'s "Data access" section) or
  relationship/rule-heavy (→ EF Core). Don't mix approaches without a documented reason.
- Which output ports the existing reference implementation already has a working
  adapter for (`SystemClock`, `GuidIdGenerator`, `HttpContextCurrentUserProvider`, the
  Null-Object `INotifier` pair) — reuse or extend those rather than rewriting them, and
  which are genuinely new (password hashing, token issuing, external services, ...) and
  need a first adapter written from scratch.

## Phase 4 — Backend implementation

Use the existing reference vertical slice (`Application/TaskManager.cs`,
`Ports/Input/ITaskManager.cs` + `TaskDto.cs`, `Ports/Output/ITaskRepository.cs` +
`TaskItem.cs`, `Infra/PostgresTaskRepository.cs`, `Infra/CachedTaskRepository.cs`,
`Infra/ServiceRegistration.cs`, `Api/Controllers/TasksController.cs`,
`Api/Models/CreateTaskRequest.cs`) purely as the **pattern to replicate** — logging
style, `Result`/`Result<T>` usage, DI lifetimes, decorator/null-object wiring,
controller error-to-status mapping — not as code to keep verbatim once it no longer
matches a real use case.

For each primary port:
1. **`Application/`**: one handler class implementing the port interface, constructor-
   injecting the output ports (+ `ILogger<T>`) it needs. Business rules from
   CONTRACT.md's Reglas become explicit branches returning `Result.Failure(...)` with
   the documented error — not exceptions, not silently-swallowed generic try/catch.
2. **`.Infra`**: implement every output port the plan calls for. Wire everything in
   `ServiceRegistration.AddInfrastructure()` — the single composition root — following
   the existing decorator/Null-Object examples where a capability actually needs one
   (don't add a decorator or feature flag CONTRACT.md doesn't call for). Add
   migrations for any new persisted entity, and confirm `Program.cs` still runs them
   at startup.
3. **`.Api`**: one thin controller per primary port, `[Authorize]` by default,
   request DTOs in `Api/Models/`, branching on `result.IsSuccess` to map to the right
   status code (mirror `TasksController`'s `BadRequest`/`NotFound`/`Ok`/`NoContent`
   pattern) — no logic beyond extracting identity, delegating, and mapping the result.
4. Register the new handler(s) in `Program.cs` (`AddScoped<IPort, Handler>()`) next to
   the existing registration, and remove the demo registration once its slice is
   retired (see Phase 6).

## Phase 5 — Tests

- **Core**: one test class per `Application/` handler, using hand-written fakes for
  every output port (add new fakes to `ServiceTemplate.Tests/Fakes/` alongside
  `StaticClock`/`StaticIdGenerator`/`StaticCurrentUserProvider`/`SpyNotifier`/
  `InMemoryTaskRepository` — same pattern, no mocking framework). Cover the success
  path, every documented error, and each Reglas invariant from CONTRACT.md.
- **Infra**: mocking-framework tests (NSubstitute, mirroring
  `CachedTaskRepositoryTests.cs`) only for adapters/decorators that wrap another
  collaborator — not for core logic.
- Run `dotnet test` on the full backend solution before moving on.

## Phase 6 — Frontend (only if the PRD implies end-user UI)

If — and only if — `docs/PRD.md` describes screens/interactions a human uses (not a
pure API/service), implement the frontend per `ARCHITECTURE.md`'s Frontend section,
using the existing `types.ts`/`api.ts`/`store/`/`App.tsx`/`components/` as the pattern:
one entity class per DTO shape, one `api.<resource>` namespace per backend resource,
one Zustand store action per mutation (calling the API, then updating state from the
response — never optimistically), flat `components/`. Retire any demo Task UI the same
way as the backend slice (Phase 7).

## Phase 7 — Retire the demo scaffolding

The repo's Task vertical slice (backend files listed in Phase 4, plus any Task-related
frontend files) is template scaffolding, not part of the product. Once its real
equivalent — or its confirmed absence from the PRD — is implemented, list every file
you intend to delete and **ask the user to confirm before deleting**, since it's a
visible, repo-wide change even though it's git-reversible. Don't delete anything the
PRD's use cases still legitimately need (e.g. if the MVP genuinely includes task
management, keep and evolve the slice instead of deleting it).

## Phase 8 — Verification

- `dotnet build` the full solution and `dotnet test`; for the frontend (if built),
  `tsc --noEmit` and `npm run build`.
- Don't just trust green builds/tests for feature correctness. Use the `run` skill (if
  available) to actually start the app and exercise the golden path for at least the
  most important use cases, and the `verify` skill for any change with a runtime
  surface. Report what you actually observed running, not just what compiled.
- Suggest `code-review` before the user commits, but don't run it unprompted if it
  wasn't asked for.

## Guardrails

- Never invent business rules, error codes, or entities beyond what `docs/PRD.md` and
  `docs/CONTRACT.md` state — mark gaps as `TODO: confirm with business` and ask,
  same as the `contract` skill does.
- Never skip Phase 1/2 and hand-write ports directly from the PRD — the contract and
  ports skills exist so the design is reviewed in writing before code depends on it.
- Never run destructive commands (dropping/resetting the dev database, force-pushing,
  `git clean`) as part of this pipeline without explicit confirmation.
- If `docs/CONTRACT.md` or the `Ports/*` files already exist and look current for a
  given use case, don't regenerate them from scratch — treat existing, correct
  artifacts as already-done phases.
