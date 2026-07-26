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
docs/API-CONVENTIONS.md
docs/DESIGN.md

The generated OpenAPI spec (`/swagger` in Development, see the `run` skill) is the source
of truth for API routes, request/response schemas and status codes — read
`docs/API-CONVENTIONS.md` for the rules that don't show up in a schema (auth, errors,
roles, invitations, cross-application behaviour). Don't hand-duplicate DTO shapes into
markdown; update the backend first, then check OpenAPI before touching frontend types.

## Environment

Console commands run in WSL2 — always use Linux command syntax, never PowerShell/cmd.

## Before finishing a task

- Load the `verify` skill and fix all issues found. Verification MUST succeed to consider the task done.
- If the task requires manual verification, use the `run` skill first.
