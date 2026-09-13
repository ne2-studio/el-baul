using ElBaul.Core.Photos.Domain;
using System.Security.Cryptography;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;

using Microsoft.Extensions.Logging;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;
public class PhotoFileService(
    ILogger<PhotoFileService> logger,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IPhotoDateExtractor photoDateExtractor,
    IPhotoImageNormalizer photoImageNormalizer,
    IImageProcessor imageProcessor,
    ImagePolicy imagePolicy)
{
    // Maps IImageProcessor.IdentifyAsync's byte-detected content type to a storage-key
    // extension — deliberately closed to exactly the content types IdentifyAsync ever returns
    // (see VipsImageProcessor.ContentTypesByLoader), never anything client-declared.
    private static readonly Dictionary<string, string> ExtensionsByContentType = new(StringComparer.Ordinal)
    {
        ["image/jpeg"] = "jpg",
        ["image/png"] = "png",
        ["image/gif"] = "gif",
        ["image/webp"] = "webp",
    };

    // Split out of SaveForUploadAsync (Slice 2.5, docs/.backlog issue #62): the global
    // exact-duplicate lookup in PhotoUploadWorkflow needs the content hash *before* deciding
    // whether to normalize/store anything at all — reusing an existing canonical PhotoAsset
    // must not cost a second normalization pass or a second stored copy (see PhotoAsset's doc
    // comment on derived-data reuse). Buffers `content` exactly once; callers that already have
    // a BufferedUpload never re-read the original stream.
    public async Task<Result<BufferedUpload>> BufferAndHashAsync(Stream content)
    {
        var buffered = new MemoryStream();
        await content.CopyToAsync(buffered);
        buffered.Position = 0;

        if (imagePolicy.ExceedsUploadBytes(buffered.Length))
        {
            await buffered.DisposeAsync();
            return Result.Failure<BufferedUpload>(ApplicationError.Validation(
                $"El archivo supera el tamaño máximo permitido ({imagePolicy.MaxUploadBytes / 1_000_000} MB)"));
        }

        // SHA-256 of exactly the bytes the server received, before any of the processing below
        // (HEIC conversion, normalization, re-encoding) touches them — see Photo.OriginalContentHash.
        var originalContentHash = Convert.ToHexStringLower(await SHA256.HashDataAsync(buffered));
        buffered.Position = 0;

        return Result.Success(new BufferedUpload(buffered, originalContentHash));
    }

    public async Task<Result<StoredPhotoFile>> SaveForUploadAsync(UserId userId, Stream content)
    {
        var bufferResult = await BufferAndHashAsync(content);
        if (bufferResult.IsFailure) return Result.Failure<StoredPhotoFile>(bufferResult.Error);

        using var buffered = bufferResult.Value;
        return await ProcessAndStoreAsync(userId, buffered);
    }

    // The normalize/identify/store half of the old SaveForUploadAsync — runs only once a caller
    // has established (via BufferAndHashAsync + a hash lookup) that this content is genuinely
    // new, i.e. no existing PhotoAsset already carries BufferedUpload.OriginalContentHash.
    public async Task<Result<StoredPhotoFile>> ProcessAndStoreAsync(UserId userId, BufferedUpload buffered)
    {
        var content = buffered.Content;
        var originalContentHash = buffered.OriginalContentHash;
        content.Position = 0;

        // Runs before EXIF extraction so ResolvePhotoDate reads dates off web-safe (e.g.
        // normalized-from-HEIC) bytes rather than a source format the date extractor may not
        // understand. This does mean the megapixel hard limit below is checked after HEIC
        // decode/re-encode rather than before it — IImageProcessor.IdentifyAsync only needs to
        // support the web-safe formats this already produces, not HEIC as well, which keeps
        // that abstraction narrow. HEIC/HEIF conversion has always run unconditionally here;
        // this ticket only adds a limit downstream of it, not a new cost.
        var normalized = await photoImageNormalizer.NormalizeAsync(content);

        // Reads the date before anything below strips metadata (NormalizeAsync, when the image
        // policy needs it, drops EXIF entirely — see IImageProcessor) — must not move after it.
        normalized.Content.Position = 0;
        var photoDate = ResolvePhotoDate(normalized.Content);

        normalized.Content.Position = 0;
        var metadata = await imageProcessor.IdentifyAsync(normalized.Content);
        if (metadata is null)
            return Result.Failure<StoredPhotoFile>(ApplicationError.Validation("El archivo no es una imagen válida"));

        if (imagePolicy.ExceedsUploadMegapixels(metadata.Dimensions.Width, metadata.Dimensions.Height))
            return Result.Failure<StoredPhotoFile>(ApplicationError.Validation(
                $"La imagen supera la resolución máxima permitida ({imagePolicy.MaxUploadMegapixels} MP)"));

        var storedFile = imagePolicy.NeedsNormalization(metadata.Dimensions.Width, metadata.Dimensions.Height)
            ? await NormalizeAndDescribeAsync(normalized, metadata)
            : DescribeAsIs(normalized, metadata);

        // The stored file name is always generated from the real, byte-detected format — never
        // from anything the client sent (see the ticket this closes: relying on client-declared
        // filename/content-type let a mislabeled or malicious upload dictate how its own bytes
        // got interpreted).
        var storedFileId = idGenerator.NewId();
        var storageKey = StorageKey.ForPhoto(userId, storedFileId, $"{storedFileId}.{ExtensionFor(storedFile.ContentType)}");
        storedFile.Content.Position = 0;
        await photoStorage.SaveAsync(storageKey, storedFile.Content, storedFile.ContentType);

        return Result.Success(new StoredPhotoFile(
            storageKey, photoDate, storedFile.SizeBytes, storedFile.Dimensions,
            storedFile.OriginalDimensions, storedFile.OriginalSizeBytes, originalContentHash));
    }

    public async Task<PhotoDownloadResult> OpenForDownloadAsync(string storageKey)
    {
        var content = await photoStorage.OpenReadForDownloadAsync(storageKey);
        return new PhotoDownloadResult(content.Content, content.ContentType, StorageKey.From(storageKey).DownloadFileName);
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
            resized.Content, resized.ContentType, resized.SizeBytes, resized.Dimensions,
            metadata.Dimensions, originalSizeBytes);
    }

    private static DescribedFile DescribeAsIs(NormalizedPhoto normalized, ImageMetadata metadata) =>
        new(normalized.Content, metadata.ContentType, normalized.Content.Length, metadata.Dimensions, null, null);

    private static string ExtensionFor(string contentType) =>
        ExtensionsByContentType.TryGetValue(contentType, out var extension) ? extension : "bin";

    private PhotoDate? ResolvePhotoDate(Stream content)
    {
        var extracted = photoDateExtractor.TryExtractDate(content);
        if (extracted is not { } e) return null;

        // EXIF always yields a full, in-range Y-M-D, so Parse can't fail here.
        return PhotoDate.Parse(e.Year, e.Month, e.Day) is { IsSuccess: true, Value: var date } ? date : null;
    }

    private record DescribedFile(
        Stream Content, string ContentType, long SizeBytes, ImageDimensions Dimensions,
        ImageDimensions? OriginalDimensions, long? OriginalSizeBytes);
}

public record StoredPhotoFile(
    string StorageKey, PhotoDate? TakenAt, long SizeBytes, ImageDimensions Dimensions,
    ImageDimensions? OriginalDimensions, long? OriginalSizeBytes, string OriginalContentHash);

// The buffered, already-hashed upload — everything PhotoUploadWorkflow needs to decide whether
// this content is an exact duplicate of an existing PhotoAsset *before* paying for normalization
// or a storage write (see PhotoFileService.BufferAndHashAsync). Owns Content and must be
// disposed by whoever calls BufferAndHashAsync.
public sealed record BufferedUpload(Stream Content, string OriginalContentHash) : IDisposable
{
    public void Dispose() => Content.Dispose();
}
