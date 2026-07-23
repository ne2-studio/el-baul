using ElBaul.Infra;
using ElBaul.Ports.Output;

namespace ElBaul.Api.Tools;

/// <summary>
/// One-off maintenance command: captions used to be the only way to add text to a photo;
/// recuerdos replaced that. This finds every active photo with a non-empty caption, creates
/// a recuerdo from it (authored by the photo's uploader, dated now — the original caption
/// carries no timestamp of its own to preserve), and clears the photo's caption. Run via
/// `dotnet ElBaul.Api.dll migrate-photo-captions-to-recuerdos` (see api/README.md) — never
/// invoked by the web process itself, so it can't affect the running server.
/// </summary>
public static class MigratePhotoCaptionsToRecuerdosCommand
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

        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(MigratePhotoCaptionsToRecuerdosCommand));

        using var scope = app.Services.CreateScope();
        var photoRepository = scope.ServiceProvider.GetRequiredService<IPhotoRepository>();
        var recuerdoRepository = scope.ServiceProvider.GetRequiredService<IRecuerdoRepository>();
        var idGenerator = scope.ServiceProvider.GetRequiredService<IIdGenerator>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();

        var photos = (await photoRepository.GetWithCaptionAsync()).ToList();
        logger.LogInformation(
            "migrate-photo-captions-to-recuerdos: {Count} photo(s) with a caption to migrate{DryRunSuffix}",
            photos.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var migrated = 0;
        var failed = 0;

        foreach (var photo in photos)
        {
            try
            {
                logger.LogInformation(
                    "Photo {PhotoId}: converting caption to a recuerdo authored by {UploadedBy}",
                    photo.Id, photo.UploadedBy);

                if (!dryRun)
                {
                    var recuerdo = new Recuerdo(
                        idGenerator.NewId(),
                        photo.Id,
                        photo.AlbumId,
                        photo.BaulId,
                        photo.UploadedBy,
                        photo.Caption!,
                        clock.UtcNow());
                    await recuerdoRepository.CreateAsync(recuerdo);
                    await photoRepository.UpdateAsync(photo with { Caption = null });
                }

                migrated++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Photo {PhotoId}: caption migration failed, leaving it as-is",
                    photo.Id);
            }
        }

        logger.LogInformation(
            "migrate-photo-captions-to-recuerdos done. Migrated: {Migrated}, failed: {Failed}{DryRunSuffix}",
            migrated, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
