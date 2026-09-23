using ElBaul.Core.Photos.Domain;

using ElBaul.Domain;
namespace ElBaul.Tests;

// Common test factory for photos whose stored dimensions are not relevant to the scenario.
// Keeping the default here makes tests explicit about when dimensions do matter, without
// coupling other test projects to this assembly.
public static class PhotoMother
{
    public static Photo Create(
        PhotoId id,
        ChapterId? chapterId,
        BaulId baulId,
        string storageKey,
        PhotoDate? date,
        UserId uploadedBy,
        DateTime createdAt,
        Guid? clientUploadId = null,
        long sizeBytes = 0,
        Guid? uploadBatchId = null,
        ImageDimensions? originalDimensions = null,
        long? originalSizeBytes = null,
        string? originalContentHash = null) =>
        Photo.Create(
            id, chapterId, baulId, storageKey, date, uploadedBy, createdAt, new(1, 1),
            clientUploadId, sizeBytes: sizeBytes, uploadBatchId: uploadBatchId,
            originalDimensions: originalDimensions, originalSizeBytes: originalSizeBytes,
            originalContentHash: originalContentHash);
}
