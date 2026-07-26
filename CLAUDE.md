# El Baúl

El Baúl helps families preserve, share and enrich their memories over decades.

## Repository structure

Monorepo, three independently deployable services, **no shared code between them**

api/    ASP.NET Core backend
app/    End-user React application
admin/  Internal administration React application

## Documentation

Read the relevant docs before making architectural, cross-service or UI changes.

docs/ARCHITECTURE.md
docs/API.md
docs/DESIGN.md

## Environment

Console commands run in WSL2 — always use Linux command syntax, never PowerShell/cmd.

## Before finishing a task

- Load the `verify` skill and fix all issues found. Verification MUST succeed to consider the task done.
- If the task requires manual verification, use the `run` skill first.
