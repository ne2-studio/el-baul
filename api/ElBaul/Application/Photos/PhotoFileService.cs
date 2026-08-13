using ElBaul.InputPorts.Photos;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Photos;
public class PhotoFileService(
    ILogger<PhotoFileService> logger,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IPhotoDateExtractor photoDateExtractor,
    IPhotoImageNormalizer photoImageNormalizer)
{
    public async Task<StoredPhotoFile> SaveForUploadAsync(
        UserId userId,
        string fileName,
        string contentType,
        Stream content,
        PhotoDate? explicitDate)
    {
        using var buffered = new MemoryStream();
        await content.CopyToAsync(buffered);
        buffered.Position = 0;

        // Runs before EXIF extraction so ResolvePhotoDate reads dates off web-safe (e.g.
        // normalized-from-HEIC) bytes rather than a source format the date extractor may not
        // understand.
        var normalized = await photoImageNormalizer.NormalizeAsync(buffered, contentType, fileName);
        var storageKey = StorageKey.ForPhoto(userId, idGenerator.NewId(), normalized.FileName);

        var sizeBytes = normalized.Content.Length;
        normalized.Content.Position = 0;
        var photoDate = ResolvePhotoDate(explicitDate, normalized.Content);
        normalized.Content.Position = 0;

        await photoStorage.SaveAsync(storageKey, normalized.Content, normalized.ContentType);

        return new StoredPhotoFile(storageKey, photoDate, sizeBytes);
    }

    public async Task<PhotoDownloadResult> OpenForDownloadAsync(string storageKey)
    {
        var content = await photoStorage.OpenReadForDownloadAsync(storageKey);
        return new PhotoDownloadResult(content.Content, content.ContentType, StorageKey.From(storageKey).OriginalFileName);
    }

    public async Task TryDeleteOrphanedStorageObjectAsync(string storageKey)
    {
        try
        {
            await photoStorage.DeleteAsync(storageKey);
        }
        catch (Exception cleanupEx)
        {
            logger.LogError(cleanupEx,
                "Failed to clean up orphaned storage object {StorageKey} after failed photo insert",
                storageKey);
        }
    }

    private PhotoDate? ResolvePhotoDate(PhotoDate? explicitDate, Stream content)
    {
        if (explicitDate is not null) return explicitDate;

        var extracted = photoDateExtractor.TryExtractDate(content);
        if (extracted is not { } e) return null;

        // EXIF always yields a full, in-range Y-M-D, so Parse can't fail here.
        return PhotoDate.Parse(e.Year, e.Month, e.Day) is { IsSuccess: true, Value: var date } ? date : null;
    }
}

public record StoredPhotoFile(string StorageKey, PhotoDate? Date, long SizeBytes);
