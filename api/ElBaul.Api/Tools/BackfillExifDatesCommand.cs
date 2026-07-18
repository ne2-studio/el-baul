using ElBaul.Infra;
using ElBaul.Ports.Output;

namespace ElBaul.Api.Tools;

/// <summary>
/// One-off maintenance command: finds photos with no date (DateYear is null — either
/// uploaded before EXIF extraction existed, or genuinely EXIF-less) and retries EXIF
/// extraction against the copy already sitting in object storage, using the exact same
/// IPhotoDateExtractor the upload path uses. Run via `dotnet ElBaul.Api.dll
/// backfill-exif-dates` (see api/README.md) — never invoked by the web process itself,
/// so it can't affect the running server.
/// </summary>
public static class BackfillExifDatesCommand
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

        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(BackfillExifDatesCommand));

        using var scope = app.Services.CreateScope();
        var photoRepository = scope.ServiceProvider.GetRequiredService<IPhotoRepository>();
        var photoStorage = scope.ServiceProvider.GetRequiredService<IPhotoStorage>();
        var dateExtractor = scope.ServiceProvider.GetRequiredService<IPhotoDateExtractor>();

        var undatedPhotos = (await photoRepository.GetUndatedAsync()).ToList();
        logger.LogInformation(
            "backfill-exif-dates: {Count} undated photo(s) to check{DryRunSuffix}",
            undatedPhotos.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var stillUndated = 0;
        var failed = 0;

        foreach (var photo in undatedPhotos)
        {
            try
            {
                await using var content = await photoStorage.OpenReadAsync(photo.StorageKey);
                var extracted = dateExtractor.TryExtractDate(content);

                if (extracted is not { } date)
                {
                    stillUndated++;
                    continue;
                }

                logger.LogInformation(
                    "Photo {PhotoId}: found EXIF date {Year:D4}-{Month:D2}-{Day:D2}",
                    photo.Id, date.Year, date.Month, date.Day);

                if (!dryRun)
                {
                    await photoRepository.UpdateAsync(photo with
                    {
                        DateYear = date.Year,
                        DateMonth = date.Month,
                        DateDay = date.Day
                    });
                }

                updated++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Photo {PhotoId} ({StorageKey}): backfill failed, leaving it as-is",
                    photo.Id, photo.StorageKey);
            }
        }

        logger.LogInformation(
            "backfill-exif-dates done. Updated: {Updated}, no EXIF found: {StillUndated}, failed: {Failed}{DryRunSuffix}",
            updated, stillUndated, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
