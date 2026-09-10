# Project context for ne2-factory

Prose context factory agents reason about. Grows as later slices move project
knowledge out of the agents. See the ne2-factory plugin's `docs/environment-contract.md`.

## Reviewer

Pedro — who an agent asks when a decision needs a human, and whose approval a change
targets.

## Default branch

`main` — trunk-based, so also the integration branch.

## Services

Independently deployable, no shared code between them.

- `api/` — ASP.NET Core backend.
- `app/` — end-user React app (`app/android/`, `app/ios/` are Capacitor shells).
- `admin/` — internal administration React app.

A change that crosses these boundaries fixes the contract between them first.

## Documentation

Read before an architectural, cross-service, or UI change.

- `docs/ARCHITECTURE.md` — service boundaries, data flow, cross-cutting decisions.
- `docs/API-CONVENTIONS.md` — HTTP contract, payload and error shape.
- `docs/DESIGN.md` — UI and product design conventions.
