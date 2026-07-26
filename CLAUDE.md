# El Baúl

El Baúl helps families preserve, share and enrich their memories over decades.

## Repository structure

Monorepo, three independently deployable services, **no shared code between them**

api/      ASP.NET Core backend
app/      React frontend
admin/    React admin

docs/ARCHITECTURE.md  Layering, conventions, testing strategy — Read before making a non-trivial change
docs/API.md           Backend API contract
docs/DESIGN.md        Frontend design tokens
docs/adr/             Decisions that override the general conventions

## Environment

Console commands run in WSL2 — always use Linux command syntax, never PowerShell/cmd.

## Before finishing a task

- Load the `verify` skill and fix all issues found.
- Need the stack running — screenshot, manual check, exploring current behavior: load the `run` skill first.
