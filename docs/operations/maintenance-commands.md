# Maintenance commands

## Overview

The published `el-baul-api` image doubles as a one-off command runner: passing a recognized
command name as the first argument makes `ElBaul.Api.dll` run that command and exit instead of
starting the web server. This is safe to run against an **already-running** deployment (Coolify,
docker-compose, etc.) via `docker exec` — it's a separate process inside the same container, so
it can't crash or interrupt the running server. See
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
4. Document what the command does, whether it's safe to re-run, and any deploy-order gate it
   creates (e.g. "must reach zero remaining candidates before deploying migration X") in that
   class's own XML doc comment — that's the source of truth for an individual command, not this
   file. See `BackfillExifDatesCommand.cs` or `BackfillRecuerdoBaulIdCommand.cs` for the shape.

## Running a command

```bash
# Local dev (docker-compose service name is "api"):
docker compose exec api dotnet ElBaul.Api.dll <command> --dry-run
docker compose exec api dotnet ElBaul.Api.dll <command>

# Coolify / any docker deployment: find the running API container, then:
docker exec <api-container> dotnet ElBaul.Api.dll <command> --dry-run
docker exec <api-container> dotnet ElBaul.Api.dll <command>

# Running the API outside Docker (dotnet run/dotnet ElBaul.Api.dll directly):
dotnet ElBaul.Api.dll <command> --dry-run
```

`<command>` is the name each command registers via `[MaintenanceCommand("...")]` — see
`api/ElBaul.Maintenance/Commands/` for what's currently available.
