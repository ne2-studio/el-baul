using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.Extensions.Logging;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;

// Created(photo, AlreadyExisted: false) for a genuinely new upload; Duplicate(existingActivePhoto,
// AlreadyExisted: true) when the upload turned out to be an exact-content duplicate of an
// already-active photo in the same baúl — Photo is then the *survivor* (the pre-existing active
// photo), never the just-uploaded bytes, so callers always project the same photo a second
// upload of that same file would keep returning.
public record PhotoUploadOutcome(Photo Photo, bool AlreadyExisted)
{
    public static PhotoUploadOutcome Created(Photo photo) => new(photo, AlreadyExisted: false);
    public static PhotoUploadOutcome Duplicate(Photo existingActivePhoto) => new(existingActivePhoto, AlreadyExisted: true);
}

public class PhotoUploadWorkflow(
    ILogger<PhotoUploadWorkflow> logger,
    IPhotoRepository photoRepository,
    PhotoFileService photoFileService,
    IIdGenerator idGenerator,
    IClock clock,
    IUnitOfWork unitOfWork)
{
    public async Task<Result<PhotoUploadOutcome>> CreatePhotoAsync(
        BaulId baulId,
        ChapterId? chapterId,
        UserId userId,
        Stream content,
        ClientUploadId clientUploadId,
        Guid? uploadBatchId,
        Func<Photo, DateTime, Task> persistRelatedStateAsync)
    {
        Result<StoredPhotoFile> storedFileResult;
        try
        {
            storedFileResult = await photoFileService.SaveForUploadAsync(userId, content);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while saving to storage {BaulId} {ChapterId}",
                baulId, chapterId);
            throw;
        }

        // Rejected by ImagePolicy (oversized file, resolution over the hard limit, or not a
        // valid image) — an expected validation outcome, not a storage/infra failure, so it
        // never touched storage and there's nothing to compensate for.
        if (storedFileResult.IsFailure) return Result.Failure<PhotoUploadOutcome>(storedFileResult.Error);
        var storedFile = storedFileResult.Value;

        var now = clock.UtcNow();
        var photo = Photo.Create(
            new PhotoId(idGenerator.NewId()), chapterId, baulId, storedFile.StorageKey, storedFile.Date, userId, now,
            clientUploadId, storedFile.SizeBytes, uploadBatchId, storedFile.Width, storedFile.Height,
            storedFile.OriginalWidth, storedFile.OriginalHeight, storedFile.OriginalSizeBytes,
            storedFile.OriginalContentHash);

        // Cheap app-level check ahead of the transaction below — the common, non-concurrent case
        // (this exact file is already in the baúl) never needs to open a transaction at all. Not
        // itself the concurrency guard: two uploads of the same file racing each other can both
        // pass this check, which is exactly why TryCreateActiveAsync's database-level uniqueness
        // (see IX_Photos_BaulId_OriginalContentHash_Active) is still required below.
        var preCheckDuplicate = await photoRepository.GetActiveByContentHashAsync(baulId, storedFile.OriginalContentHash);
        if (preCheckDuplicate is not null)
        {
            return await RecordDuplicateAsync(photo, preCheckDuplicate, now, baulId, storedFile.StorageKey);
        }

        try
        {
            // The photo row and its related aggregate bookkeeping commit together; if metadata
            // persistence fails after the storage object is already saved, compensate below.
            return await unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                if (await photoRepository.TryCreateActiveAsync(photo))
                {
                    await persistRelatedStateAsync(photo, now);
                    return Result.Success(PhotoUploadOutcome.Created(photo));
                }

                // Lost the race: another upload of the same exact file for this baúl committed
                // first, between the pre-check above and this insert. Reuse the exact same
                // duplicate-recording behavior as the pre-check case instead of a second, subtly
                // different code path for what is domain-wise the same outcome.
                var winner = await photoRepository.GetActiveByContentHashAsync(baulId, storedFile.OriginalContentHash)
                    ?? throw new InvalidOperationException(
                        $"TryCreateActiveAsync reported a hash conflict for baúl {baulId} but no active photo with that hash was found.");
                var outcomeResult = await RecordDuplicateAsync(photo, winner, now, baulId, storedFile.StorageKey);
                return outcomeResult;
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while persisting photo metadata {BaulId} {ChapterId} {PhotoId} {StorageKey}",
                baulId, chapterId, photo.Id, storedFile.StorageKey);
            await photoFileService.TryDeleteOrphanedStorageObjectAsync(storedFile.StorageKey);
            throw;
        }
    }

    // Persists the just-uploaded (but never-active) bytes as an already soft-deleted duplicate
    // row — its storage key stays tracked and auditable (see PhotoDeletionReasons.FlaggedAsDuplicate)
    // rather than becoming an orphaned blob no row points at. It never went through
    // persistRelatedStateAsync (chapter/baúl PhotoCount, cover), so there's nothing to undo there.
    private async Task<Result<PhotoUploadOutcome>> RecordDuplicateAsync(
        Photo uploadedPhoto, Photo existingActivePhoto, DateTime now, BaulId baulId, string storageKey)
    {
        logger.LogInformation(
            "Duplicate photo upload detected {BaulId} {UploadedPhotoId} {ExistingPhotoId} {StorageKey}",
            baulId, uploadedPhoto.Id, existingActivePhoto.Id, storageKey);

        var flaggedDuplicate = uploadedPhoto.MarkDeleted(PhotoDeletionReasons.FlaggedAsDuplicate, now);
        await photoRepository.CreateAsync(flaggedDuplicate);

        return Result.Success(PhotoUploadOutcome.Duplicate(existingActivePhoto));
    }
}
