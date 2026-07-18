using ElBaul.Infra;
using ElBaul.Ports.Output;

namespace ElBaul.Api.Tools;

/// <summary>
/// One-off maintenance command: Recuerdo now carries its own AlbumId (denormalized from
/// Photo.AlbumId) so the Recuerdos feed can query by chapter without joining through Photo.
/// This backfills that AlbumId for every existing recuerdo that already has a PhotoId but
/// no AlbumId yet — newly created recuerdos set it themselves. Run via `dotnet
/// ElBaul.Api.dll backfill-recuerdo-album-id` (see api/README.md) — never invoked by the
/// web process itself, so it can't affect the running server.
/// </summary>
public static class BackfillRecuerdoAlbumIdCommand
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

        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(BackfillRecuerdoAlbumIdCommand));

        using var scope = app.Services.CreateScope();
        var recuerdoRepository = scope.ServiceProvider.GetRequiredService<IRecuerdoRepository>();
        var photoRepository = scope.ServiceProvider.GetRequiredService<IPhotoRepository>();

        var candidates = (await recuerdoRepository.GetWithPhotoAndNoAlbumAsync()).ToList();
        logger.LogInformation(
            "backfill-recuerdo-album-id: {Count} recuerdo(s) to check{DryRunSuffix}",
            candidates.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var leftNull = 0;
        var failed = 0;

        foreach (var recuerdo in candidates)
        {
            try
            {
                var photo = await photoRepository.GetByIdAsync(recuerdo.PhotoId!.Value);
                if (photo?.AlbumId is not { } albumId)
                {
                    // Photo missing or loose (no album) — nothing to backfill, leave AlbumId null.
                    leftNull++;
                    continue;
                }

                logger.LogInformation(
                    "Recuerdo {RecuerdoId}: setting AlbumId {AlbumId} from photo {PhotoId}",
                    recuerdo.Id, albumId, recuerdo.PhotoId);

                if (!dryRun)
                {
                    await recuerdoRepository.UpdateAsync(recuerdo with { AlbumId = albumId });
                }

                updated++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Recuerdo {RecuerdoId} ({PhotoId}): backfill failed, leaving it as-is",
                    recuerdo.Id, recuerdo.PhotoId);
            }
        }

        logger.LogInformation(
            "backfill-recuerdo-album-id done. Updated: {Updated}, left null (loose photo): {LeftNull}, failed: {Failed}{DryRunSuffix}",
            updated, leftNull, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
