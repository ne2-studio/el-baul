---
name: contract
description: "Generates or updates docs/CONTRACT.md from docs/PRD.md: the list of application use cases, each as a mini-specification (Input/Output/Errors/Rules). Use it when the user asks to generate the contract, update CONTRACT.md, or define use cases from the PRD."
---

## Goal

From `docs/PRD.md`, produce `docs/CONTRACT.md`: the list of application use cases, each
as a 6-8 line mini-specification. This document is the **observable behavior
contract**, not a technical design. At this stage, nothing is designed — no endpoints,
no tables, no classes, no architecture.

## Steps

1. Read `docs/PRD.md`. If it doesn't exist, tell the user it's missing and stop (don't
   invent a PRD).
2. Identify all use cases: every distinct capability or action an actor (user, external
   system, job) can invoke. A use case usually maps to a verb + entity (e.g.
   "Authenticate", "CreateOrder", "CancelSubscription").
3. For each use case, write a **6-8 line** mini-specification with exactly these 4
   sections:
   - **Input**: minimum required fields. Don't add optional or implementation fields
     the PRD doesn't ask for.
   - **Output (OK)**: what is returned when everything goes well. Shape of the
     response, not a full schema.
   - **Errors**: the expected errors for the use case, stating for each whether it is
     **idempotent** or not (whether repeating the operation with the same input
     produces the same result without additional side effects).
   - **Rules**: business invariants that change behavior (conditions that block,
     filter, or alter the result).
4. Don't design implementation: no HTTP routes, REST verbs, table names, classes,
   DTOs, or architecture decisions. Only the behavior observable from outside the
   system.
5. If the PRD doesn't make an error or rule clear for a use case, don't invent it: mark
   it as `TODO: confirm with business`.
6. Write (or overwrite) `docs/CONTRACT.md` with one use case per section, numbered in
   the order they appear in the PRD, following the format below.
7. If `docs/CONTRACT.md` already exists, before overwriting ask the user whether to
   regenerate it entirely or only add/update the use cases that changed in the PRD.

## Output format (`docs/CONTRACT.md`)

```markdown
# CONTRACT

List of application use cases. Each one is a mini-specification of observable
behavior — not a technical design.

## 1) Authenticate

- **Input**: username, password
- **Output (OK)**: idToken + expiresAt
- **Errors**: invalid_credentials (not idempotent, does not leak whether the user
  exists), user_disabled (not idempotent)
- **Rules**: if the user is disabled → no token is issued

## 2) <NextUseCase>

- **Input**: ...
- **Output (OK)**: ...
- **Errors**: ...
- **Rules**: ...
```

## Notes

- Each section should fit in 6-8 lines. If a use case needs more, it's probably two
  separate use cases — split them.
- Don't mix read use cases (queries) and write use cases (commands) in the same
  section; treat them as separate use cases if the PRD distinguishes them.
