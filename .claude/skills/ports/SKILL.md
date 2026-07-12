---
name: ports
description: "Generates the primary (Ports/Input) and secondary (Ports/Output) .NET interfaces of the backend core from docs/CONTRACT.md, following the hexagonal architecture in docs/ARCHITECTURE.md. Use it when the user asks to define the ports, formalize the public surface, or turn the CONTRACT.md use cases into .NET interfaces."
---

## Goal

Turn `docs/CONTRACT.md` (the use-case mini-specs) into the backend core's public
surface: primary ports (`Ports/Input/`), secondary ports (`Ports/Output/`), and their
DTOs/records — real `.cs` files, following the hexagonal layering in
`docs/ARCHITECTURE.md`. This is still a design step, not an implementation step: no
`Application/` handler classes, no `.Infra` adapters, no wiring.

The test for "done": every use case in CONTRACT.md could be implemented tomorrow with
TDD against in-memory/fake adapters for every output port, without changing a single
signature written here.

## Prerequisites

- `docs/CONTRACT.md` must exist. If it doesn't, tell the user to run the `contract`
  skill first and stop.
- Re-read `docs/ARCHITECTURE.md` fresh each time — it's the source of truth for
  conventions (project layout, `Result` usage, DI, multi-tenancy, naming). If anything
  below conflicts with it, `ARCHITECTURE.md` wins.

## Steps

1. Read `docs/CONTRACT.md` in full.
2. Read `docs/ARCHITECTURE.md`, focused on "Architecture: ports & adapters" and "Core
   conventions".
3. Locate the backend core project: the single project under `backend/` with no
   `.Api`/`.Infra`/`.Tests` suffix (e.g. `backend/ServiceTemplate/`). If it already
   contains example ports (e.g. a demo `ITaskManager`/`TaskItem`), read them purely as
   a **style reference** (naming, XML doc style, `Result` usage) — they are template
   scaffolding, not use cases to reuse, extend, or leave in place once real ports exist
   for the same concepts.
4. Extract the minimal ubiquitous language: for every concept the Input/Output/Rules
   columns of CONTRACT.md actually name (e.g. `User`, `Role`, `IdToken`), decide if it
   needs a type. Add nothing a rule or DTO doesn't require — no fields "for later," no
   entities for concepts only mentioned in passing.
5. Group use cases into primary ports by actor / bounded resource area — one interface
   per group, one method per use case, never a single interface for every use case in
   the app. A single actor/domain is fine as one interface (mirroring the existing
   `ITaskManager`-style naming: `I{ResourceOrActor}...`).
6. For each primary port method:
   - Return `Task<Result<TDto>>` when the use case has a success payload, `Task<Result>`
     when it's a pure command with none (mirror `DeleteAsync` in the reference
     `ITaskManager`).
   - Parameters are exactly the CONTRACT.md Input fields — nothing extra. In
     particular, don't add a user-id parameter if `ARCHITECTURE.md`'s
     `ICurrentUserProvider` convention applies; the use case reads it itself.
   - Write an XML doc `<summary>`/`<param>`/`<returns>` that states the success case
     and — this is where the "typed errors" from CONTRACT.md's Errores line become
     discoverable — every error this method can return and whether each is
     idempotent. This codebase surfaces errors as plain failure strings via
     `Result`/`Result<T>` (CSharpFunctionalExtensions), not a custom error-enum type —
     keep that convention unless an existing port in the repo already does otherwise.
7. Design DTOs in `Ports/Input/` as plain records, one per shape actually needed
   (an input record only once a method needs more than 2-3 primitive params; an output
   record whenever CONTRACT.md's Output line describes a shape):
   - Never mirror a domain/output-port entity 1:1 — expose only what CONTRACT.md's
     Output line asks for.
   - Never include secrets or hashes (e.g. no `passwordHash`).
   - Ids are `string`, even where the internal type is `Guid` (per ARCHITECTURE.md).
8. Design secondary ports in `Ports/Output/` strictly from capabilities the use cases
   need, not from anticipated future needs:
   - Persistence → one `I{Entity}Repository` per aggregate actually read/written,
     operating on a minimal internal record living in `Ports/Output/` (mirror
     `ITaskRepository`/`TaskItem`) — that record is never returned by a primary port
     directly, only mapped into a DTO.
   - Every other nondeterministic or effectful capability the core needs (hashing,
     token issuing, id generation, clock, current user, outbound notifications, etc.)
     → one small single-purpose interface per capability, matching the size of
     `IClock`/`IIdGenerator`/`ICurrentUserProvider`/`INotifier`. Don't add a
     capability CONTRACT.md doesn't require yet (e.g. no JWT-validation port if no use
     case validates a token).
9. Before writing anything to disk, do a silent mental walkthrough — call the ports in
   order, no implementation — of at least the two most rule-heavy use cases in
   CONTRACT.md. If a step can't be expressed purely in terms of the ports just
   designed (needs an adapter-specific type, an unmodeled capability, or a signature
   change), fix the design now, not after the files exist.
10. Write each interface/DTO/record as its own file under the core project's
    `Ports/Input/` or `Ports/Output/`, matching the existing naming (`I{Name}.cs` for
    interfaces, `{Name}.cs` for records) and namespace (`{CoreProject}.Ports.Input` /
    `...Ports.Output`).
11. Stop there. Do not create `Application/` handler classes, do not touch `.Infra` or
    `.Api` projects, do not wire DI. Say explicitly in your summary that this only
    covers the ports, and implementation is a separate step.
12. Build just the core project (`dotnet build` on the core `.csproj`, not the whole
    solution) to confirm everything compiles.

## Anti-coupling checklist (before finishing)

- [ ] No `Ports/Input` interface or DTO mentions DB/JWT/ORM/HTTP types.
- [ ] No DTO includes a secret/hash field.
- [ ] No output-port entity or DTO uses a library type (e.g. a JWT library's token
      class) — only plain records/primitives.
- [ ] Every nondeterministic/effectful capability (time, ids, hashing, tokens, current
      user, ...) sits behind an interface — none inlined as a raw call.
- [ ] Every documented error traces back to an Errores line in CONTRACT.md — nothing
      invented, nothing missing.
- [ ] One primary port interface per actor/resource area — no God interface covering
      every use case.
- [ ] No secondary port exists that step 9's walkthrough didn't actually need.

## Traps to avoid

- A single `IXxxService` covering every actor and every use case.
- A library type (e.g. `JwtSecurityToken`) leaking into a `Ports/*` signature.
- A DTO that's just the domain/output-port entity renamed.
- Modeling repositories/entities CONTRACT.md doesn't need yet (e.g. a separate
  `RoleRepository` when roles are just a field on `User`).
- Threading the caller's user id through every method instead of using
  `ICurrentUserProvider`.
