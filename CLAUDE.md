# El Baúl

El Baúl helps families preserve, share and enrich their memories over decades.

## Repository structure

Monorepo, three independently deployable services, **no shared code between them**
— `docs/ARCHITECTURE.md` is the binding architecture standard for both `api/`, `app/`
and `admin/` (layering, conventions, testing strategy). Read the relevant section
before making a non-trivial change.

| Directory | Contents |
|---|---|
| `api/` | ASP.NET Core (.NET 10) backend — see `api/README.md` |
| `app/` | React 19 consumer frontend — see `app/README.md` |
| `admin/` | React 19 ops backoffice, same `api/` |
| `docs/ARCHITECTURE.md` | Layering, conventions, testing strategy — binding for `api/`+`app/`+`admin/` |
| `docs/API.md` | Backend API contract |
| `docs/DESIGN.md` | Frontend design tokens |
| `docs/adr/` | Decisions that override the general conventions within their stated scope |

## Environment

Console commands run in WSL2 — always use Linux command syntax, never PowerShell/cmd.

## Before finishing a task

- Load the `verify` skill and fix all issues found.
- Need the stack running — screenshot, manual check, exploring current behavior: load the `run` skill first.
