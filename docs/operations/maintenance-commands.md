# Maintenance commands

## Overview

The published `el-baul-api` image includes `ElBaul.Maintenance.dll`, a standalone executable
published alongside the web app: passing a recognized command name as its first argument runs
that command and exits. This is safe to run against an **already-running** deployment (Coolify,
docker-compose, etc.) via `docker exec` — it's a separate process inside the same container, so
it can't crash or interrupt the running server. `ElBaul.Api` doesn't reference `ElBaul.Maintenance`
at all; the two are independent entry points that happen to ship in the same image. See
[`../architecture/backend.md`](../architecture/backend.md#maintenance-commands) for how the
dispatch mechanism (`MaintenanceCommandRunner`) fits into the project structure.

Every command supports `--dry-run`, which logs what it would change without writing anything —
run that first, always.

## Adding a command

1. Add a class to `api/ElBaul.Maintenance/Commands/` implementing `IMaintenanceCommand`
   (`Task<int> RunAsync(bool dryRun)`), tagged with `[MaintenanceCommand("command-name")]`.
   `MaintenanceCommandRunner` discovers it via reflection — no separate registration list.
2. Take dependencies via constructor injection, resolved from the same DI container the web app
   uses (`AddInfrastructure`).
3. Loop over items with a per-item `try`/`catch` so one failure doesn't abort the run; return
   `0` if everything succeeded, non-zero otherwise. The runner already handles hosting, config,
   logging, and an unhandled exception around the whole call — a command only needs the
   per-item loop.
4. Add unit tests in `api/ElBaul.Maintenance.Tests/` covering dry-run behavior, the write path,
   and failure handling for the new command.
5. Document what the command does, whether it's safe to re-run, and any deploy-order gate it
   creates (e.g. "must reach zero remaining candidates before deploying migration X") in that
   class's own XML doc comment — that's the source of truth for an individual command, not this
   file. See `BackfillExifDatesCommand.cs` or `BackfillRecuerdoBaulIdCommand.cs` for the shape.

## Testing commands

Maintenance command unit tests live in `api/ElBaul.Maintenance.Tests/` and are included in
`api/ElBaul.slnx`, so the normal backend verification command runs them:

```bash
cd api
dotnet test
```

For changes that touch real persistence, storage, external providers, or deploy-order behavior,
also run the command against the live container with `--dry-run` before and after applying it.

## Running a command

```bash
# Local dev (docker-compose service name is "api"):
docker compose exec api dotnet ElBaul.Maintenance.dll <command> --dry-run
docker compose exec api dotnet ElBaul.Maintenance.dll <command>

# Coolify / any docker deployment: find the running API container, then:
docker exec <api-container> dotnet ElBaul.Maintenance.dll <command> --dry-run
docker exec <api-container> dotnet ElBaul.Maintenance.dll <command>

# Running outside Docker (from api/ElBaul.Maintenance's publish/build output):
dotnet ElBaul.Maintenance.dll <command> --dry-run
```

`<command>` is the name each command registers via `[MaintenanceCommand("...")]` — see
`api/ElBaul.Maintenance/Commands/` for what's currently available.
