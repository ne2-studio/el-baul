using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

public class PhotoFileService(
    ILogger<PhotoFileService> logger,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IPhotoDateExtractor photoDateExtractor)
{
    public async Task<StoredPhotoFile> SaveForUploadAsync(
        string userId,
        string fileName,
        string contentType,
        Stream content,
        PhotoDate? explicitDate)
    {
        var storageKey = StorageKey.ForPhoto(userId, idGenerator.NewId(), fileName);

        using var buffered = new MemoryStream();
        await content.CopyToAsync(buffered);
        buffered.Position = 0;
        var photoDate = ResolvePhotoDate(explicitDate, buffered);
        buffered.Position = 0;

        await photoStorage.SaveAsync(storageKey, buffered, contentType);

        return new StoredPhotoFile(storageKey, photoDate);
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

        // EXIF always yields a full, in-range Y-M-D, so TryCreate can't fail here.
        var extracted = photoDateExtractor.TryExtractDate(content);
        return extracted is { } e && PhotoDate.TryCreate(e.Year, e.Month, e.Day, out var extractedDate, out _)
            ? extractedDate
            : null;
    }
}

public record StoredPhotoFile(string StorageKey, PhotoDate? Date);
