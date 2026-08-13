using ElBaul.InputPorts.Photos;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;

using Microsoft.Extensions.Logging;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Application.Photos;
public class PhotoFileService(
    ILogger<PhotoFileService> logger,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IPhotoDateExtractor photoDateExtractor,
    IPhotoImageNormalizer photoImageNormalizer,
    IImageProcessor imageProcessor,
    ImagePolicy imagePolicy)
{
    public async Task<Result<StoredPhotoFile>> SaveForUploadAsync(
        UserId userId,
        string fileName,
        string contentType,
        Stream content,
        PhotoDate? explicitDate)
    {
        using var buffered = new MemoryStream();
        await content.CopyToAsync(buffered);
        buffered.Position = 0;

        if (imagePolicy.ExceedsUploadBytes(buffered.Length))
            return Result.Failure<StoredPhotoFile>(ApplicationError.Validation(
                $"El archivo supera el tamaño máximo permitido ({imagePolicy.MaxUploadBytes / 1_000_000} MB)"));

        // Runs before EXIF extraction so ResolvePhotoDate reads dates off web-safe (e.g.
        // normalized-from-HEIC) bytes rather than a source format the date extractor may not
        // understand. This does mean the megapixel hard limit below is checked after HEIC
        // decode/re-encode rather than before it — IImageProcessor.IdentifyAsync only needs to
        // support the web-safe formats this already produces, not HEIC as well, which keeps
        // that abstraction narrow. HEIC/HEIF conversion has always run unconditionally here;
        // this ticket only adds a limit downstream of it, not a new cost.
        var normalized = await photoImageNormalizer.NormalizeAsync(buffered, contentType, fileName);

        // Reads the date before anything below strips metadata (NormalizeAsync, when the image
        // policy needs it, drops EXIF entirely — see IImageProcessor) — must not move after it.
        normalized.Content.Position = 0;
        var photoDate = ResolvePhotoDate(explicitDate, normalized.Content);

        normalized.Content.Position = 0;
        var metadata = await imageProcessor.IdentifyAsync(normalized.Content);
        if (metadata is null)
            return Result.Failure<StoredPhotoFile>(ApplicationError.Validation("El archivo no es una imagen válida"));

        if (imagePolicy.ExceedsUploadMegapixels(metadata.Width, metadata.Height))
            return Result.Failure<StoredPhotoFile>(ApplicationError.Validation(
                $"La imagen supera la resolución máxima permitida ({imagePolicy.MaxUploadMegapixels} MP)"));

        var storedFile = imagePolicy.NeedsNormalization(metadata.Width, metadata.Height)
            ? await NormalizeAndDescribeAsync(normalized, metadata)
            : DescribeAsIs(normalized, metadata);

        var storageKey = StorageKey.ForPhoto(userId, idGenerator.NewId(), normalized.FileName);
        storedFile.Content.Position = 0;
        await photoStorage.SaveAsync(storageKey, storedFile.Content, storedFile.ContentType);

        return Result.Success(new StoredPhotoFile(
            storageKey, photoDate, storedFile.SizeBytes, storedFile.Width, storedFile.Height,
            storedFile.OriginalWidth, storedFile.OriginalHeight, storedFile.OriginalSizeBytes));
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

    private async Task<DescribedFile> NormalizeAndDescribeAsync(NormalizedPhoto normalized, ImageMetadata metadata)
    {
        var originalSizeBytes = normalized.Content.Length;
        normalized.Content.Position = 0;
        var resized = await imageProcessor.NormalizeAsync(normalized.Content, imagePolicy.MaxStoredLongEdge);

        return new DescribedFile(
            resized.Content, resized.ContentType, resized.SizeBytes, resized.Width, resized.Height,
            metadata.Width, metadata.Height, originalSizeBytes);
    }

    private static DescribedFile DescribeAsIs(NormalizedPhoto normalized, ImageMetadata metadata) =>
        new(normalized.Content, normalized.ContentType, normalized.Content.Length, metadata.Width, metadata.Height,
            null, null, null);

    private PhotoDate? ResolvePhotoDate(PhotoDate? explicitDate, Stream content)
    {
        if (explicitDate is not null) return explicitDate;

        var extracted = photoDateExtractor.TryExtractDate(content);
        if (extracted is not { } e) return null;

        // EXIF always yields a full, in-range Y-M-D, so Parse can't fail here.
        return PhotoDate.Parse(e.Year, e.Month, e.Day) is { IsSuccess: true, Value: var date } ? date : null;
    }

    private record DescribedFile(
        Stream Content, string ContentType, long SizeBytes, int Width, int Height,
        int? OriginalWidth, int? OriginalHeight, long? OriginalSizeBytes);
}

public record StoredPhotoFile(
    string StorageKey, PhotoDate? Date, long SizeBytes, int Width, int Height,
    int? OriginalWidth, int? OriginalHeight, long? OriginalSizeBytes);
