# El Baúl

El Baúl helps families preserve, share and enrich their memories over decades.

## Repository structure

Monorepo, three independently deployable services, **no shared code between them**

api/         ASP.NET Core backend
app/         End-user React application
app/android/ Capacitor Android shell
app/ios/     Capacitor iPhone shell
admin/       Internal administration React application
e2e-tests/   Whole-repo Playwright e2e suite

## Documentation

Read the relevant docs before making architectural, cross-service or UI changes.

docs/ARCHITECTURE.md
docs/API-CONVENTIONS.md
docs/DESIGN.md

## Before finishing a task

- Use the `verify` skill to choose the smallest evidence set that covers the risks in the diff.
- Run the relevant canonical `./scripts/verify ...` command and fix all issues found.
  Verification MUST succeed to consider the task done.
- If the task requires manual verification, use the `run` skill first.
