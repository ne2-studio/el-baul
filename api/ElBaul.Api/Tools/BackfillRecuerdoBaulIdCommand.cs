using ElBaul.Infra;
using ElBaul.Ports.Output;

namespace ElBaul.Api.Tools;

/// <summary>
/// One-off maintenance command: Recuerdo now carries its own BaulId (denormalized from
/// Photo.BaulId/Album.BaulId, or set directly for standalone recuerdos) so the Recuerdos tab
/// can query a whole baúl without joining through Photo/Album. This backfills that BaulId for
/// every existing recuerdo created before that change, resolving it from the recuerdo's
/// PhotoId (photo's BaulId) or AlbumId (album's BaulId) — newly created recuerdos set it
/// themselves. Run via `dotnet ElBaul.Api.dll backfill-recuerdo-baul-id` (see api/README.md)
/// — never invoked by the web process itself, so it can't affect the running server.
///
/// Gates a follow-up migration (MakeRecuerdoBaulIdRequired) that makes the column NOT NULL —
/// do not deploy that migration until a --dry-run of this command reports zero remaining
/// candidates.
/// </summary>
public static class BackfillRecuerdoBaulIdCommand
{
    public static async Task<int> RunAsync(string[] args)
    {
        var dryRun = args.Contains("--dry-run");

        // Reuses WebApplication.CreateBuilder purely for its config loading (same
        // appsettings.json/appsettings.{ASPNETCORE_ENVIRONMENT}.json/env var resolution
        // the real app uses) — Build() never binds a port unless Run()/Start() is called,
        // and this path calls neither, so no Kestrel, no controllers, no auth pipeline.
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddInfrastructure(builder.Configuration);
        await using var app = builder.Build();

        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(BackfillRecuerdoBaulIdCommand));

        using var scope = app.Services.CreateScope();
        var recuerdoRepository = scope.ServiceProvider.GetRequiredService<IRecuerdoRepository>();
        var photoRepository = scope.ServiceProvider.GetRequiredService<IPhotoRepository>();
        var albumRepository = scope.ServiceProvider.GetRequiredService<IAlbumRepository>();

        var candidates = (await recuerdoRepository.GetCandidatesWithNoBaulIdAsync()).ToList();
        logger.LogInformation(
            "backfill-recuerdo-baul-id: {Count} recuerdo(s) to check{DryRunSuffix}",
            candidates.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var leftNull = 0;
        var failed = 0;

        foreach (var candidate in candidates)
        {
            try
            {
                Guid? baulId = null;

                if (candidate.PhotoId is { } photoId)
                {
                    var photo = await photoRepository.GetByIdAsync(photoId);
                    baulId = photo?.BaulId;
                }
                else if (candidate.AlbumId is { } albumId)
                {
                    var album = await albumRepository.GetByIdAsync(albumId);
                    baulId = album?.BaulId;
                }

                if (baulId is not { } resolvedBaulId)
                {
                    // Standalone recuerdo (no photo, no album) or its photo/album no longer
                    // exists — nothing to resolve BaulId from, leave it null.
                    leftNull++;
                    continue;
                }

                logger.LogInformation(
                    "Recuerdo {RecuerdoId}: setting BaulId {BaulId}",
                    candidate.Id, resolvedBaulId);

                if (!dryRun)
                {
                    await recuerdoRepository.SetBaulIdAsync(candidate.Id, resolvedBaulId);
                }

                updated++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Recuerdo {RecuerdoId}: backfill failed, leaving it as-is",
                    candidate.Id);
            }
        }

        logger.LogInformation(
            "backfill-recuerdo-baul-id done. Updated: {Updated}, left null (unresolvable): {LeftNull}, failed: {Failed}{DryRunSuffix}",
            updated, leftNull, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
