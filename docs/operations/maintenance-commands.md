# Maintenance commands

The published `el-baul-api` image doubles as a one-off command runner: passing a recognized
command name as the first argument makes `ElBaul.Api.dll` run that command and exit instead of
starting the web server. This is safe to run against an **already-running** deployment (Coolify,
docker-compose, etc.) via `docker exec` — it's a separate process inside the same container, so
it can't crash or interrupt the running server, and each command is written to keep going past
per-item failures rather than aborting the whole run. See
[`../architecture/backend.md`](../architecture/backend.md#maintenance-commands) for how the
dispatch mechanism fits into the project structure.

## `backfill-exif-dates`

Finds every photo with no date, re-reads it from object storage, and retries EXIF extraction —
the same `IPhotoDateExtractor` the upload path uses. Safe to re-run anytime (only ever looks at
photos still missing a date) and safe to run while the app is serving traffic.

```bash
# Coolify / any docker deployment: find the running API container, then:
docker exec <api-container> dotnet ElBaul.Api.dll backfill-exif-dates --dry-run
docker exec <api-container> dotnet ElBaul.Api.dll backfill-exif-dates

# Local dev (docker-compose service name is "api"):
docker compose exec api dotnet ElBaul.Api.dll backfill-exif-dates --dry-run
docker compose exec api dotnet ElBaul.Api.dll backfill-exif-dates

# Running the API outside Docker (dotnet run/dotnet ElBaul.Api.dll directly):
dotnet ElBaul.Api.dll backfill-exif-dates --dry-run
```

`--dry-run` logs what it would change without writing anything — run that first. Without it, it
updates the DB as it goes. Progress and a final summary (updated / no EXIF found / failed
counts) are logged to stdout; exit code is `0` if nothing failed, `1` otherwise.

## `backfill-recuerdo-baul-id`

Recuerdo carries its own `BaulId` (denormalized from `Photo.BaulId`/`Chapter.BaulId`, or set
directly for standalone recuerdos) so the Recuerdos tab can query a whole baúl without joining
through Photo/Chapter. New recuerdos set it themselves; this backfills it for every recuerdo
created before that change. Safe to re-run anytime and safe to run while the app is serving
traffic.

Unlike `backfill-exif-dates`, this one gates a follow-up migration: do not deploy the build that
makes `BaulId` `NOT NULL` until this command reports zero remaining candidates — re-run with
`--dry-run` after backfilling and confirm it logs `0 recuerdo(s) to check` (and that the prior
real run's `failed` count was `0`) before deploying that migration. Applying it while nulls
remain fails the migration outright and the app won't start, since migrations run at startup.

```bash
# Coolify / any docker deployment: find the running API container, then:
docker exec <api-container> dotnet ElBaul.Api.dll backfill-recuerdo-baul-id --dry-run
docker exec <api-container> dotnet ElBaul.Api.dll backfill-recuerdo-baul-id

# Local dev (docker-compose service name is "api"):
docker compose exec api dotnet ElBaul.Api.dll backfill-recuerdo-baul-id --dry-run
docker compose exec api dotnet ElBaul.Api.dll backfill-recuerdo-baul-id

# Running the API outside Docker (dotnet run/dotnet ElBaul.Api.dll directly):
dotnet ElBaul.Api.dll backfill-recuerdo-baul-id --dry-run
```

`--dry-run` logs what it would change without writing anything — run that first. Without it, it
updates the DB as it goes. Progress and a final summary (updated / left null (unresolvable) /
failed counts) are logged to stdout; exit code is `0` if nothing failed, `1` otherwise.
