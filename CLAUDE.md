# El Baúl

El Baúl helps families preserve, share and enrich their memories over decades.

## Repository structure

Monorepo, three independently deployable services, **no shared code between them**

api/         ASP.NET Core backend
app/         End-user React application
app/android/ Capacitor Android shell
admin/       Internal administration React application
e2e-tests/   Whole-repo Playwright e2e suite

## Documentation

Read the relevant docs before making architectural, cross-service or UI changes.

docs/ARCHITECTURE.md
docs/API-CONVENTIONS.md
docs/DESIGN.md

## API contract changes

If backend DTOs or controllers change the HTTP contract, run:

1. `./scripts/openapi accept-contract`
2. `./scripts/openapi generate-types`
3. `./scripts/verify backend`
4. `./scripts/verify frontend`
5. `./scripts/verify admin`

## Environment

Console commands run in WSL2 — always use Linux command syntax, never PowerShell/cmd.

## Before finishing a task

- Use the `verify` skill to choose the smallest evidence set that covers the risks in the diff.
- Run the relevant canonical `./scripts/verify ...` command and fix all issues found.
  Verification MUST succeed to consider the task done.
- If the task requires manual verification, use the `run` skill first.
