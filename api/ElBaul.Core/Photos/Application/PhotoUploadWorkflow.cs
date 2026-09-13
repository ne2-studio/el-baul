using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.Extensions.Logging;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;

// Created(photo, AlreadyExisted: false) for a genuinely new Photo — either brand-new bytes, or an
// existing canonical PhotoAsset (Slice 2.5, docs/.backlog issue #62) seeing this baúl for the
// first time. Duplicate(existingActivePhoto, AlreadyExisted: true) whenever the upload turns out
// to already be active in this exact baúl — Photo is then the *survivor* (the pre-existing active
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
        Result<BufferedUpload> bufferResult;
        try
        {
            bufferResult = await photoFileService.BufferAndHashAsync(content);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Photo upload failed while buffering the upload {BaulId} {ChapterId}", baulId, chapterId);
            throw;
        }

        // Rejected by ImagePolicy (oversized file) — an expected validation outcome, not a
        // storage/infra failure, so it never touched storage and there's nothing to compensate for.
        if (bufferResult.IsFailure) return Result.Failure<PhotoUploadOutcome>(bufferResult.Error);
        using var buffered = bufferResult.Value;

        var now = clock.UtcNow();

        // Global exact-duplicate lookup (Slice 2.5, docs/.backlog issue #62) — ahead of any
        // normalization or storage write, so reusing an existing canonical PhotoAsset never
        // costs a second stored copy or a second round of derived-data computation (dimensions,
        // normalization). This is the common-case, non-concurrent check; two uploads of the same
        // previously-unseen bytes can still race past it, which is exactly why
        // TryCreateAssetAsync's database-level uniqueness further down is still required.
        var existingAsset = await photoRepository.GetAssetByContentHashAsync(buffered.OriginalContentHash);
        if (existingAsset is not null)
        {
            return await ReuseExistingAssetAsync(existingAsset, baulId, chapterId, userId, now, persistRelatedStateAsync);
        }

        Result<StoredPhotoFile> storedFileResult;
        try
        {
            storedFileResult = await photoFileService.ProcessAndStoreAsync(userId, buffered);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while saving to storage {BaulId} {ChapterId}",
                baulId, chapterId);
            throw;
        }

        if (storedFileResult.IsFailure) return Result.Failure<PhotoUploadOutcome>(storedFileResult.Error);
        var storedFile = storedFileResult.Value;

        var photo = Photo.Create(
            new PhotoId(idGenerator.NewId()), chapterId, baulId, storedFile.StorageKey, storedFile.TakenAt, userId, now,
            storedFile.Dimensions, clientUploadId, storedFile.SizeBytes, uploadBatchId,
            storedFile.OriginalDimensions, storedFile.OriginalSizeBytes,
            storedFile.OriginalContentHash);

        try
        {
            // The new PhotoAsset, its UserPhotoAsset relation, the new Photo row and its related
            // aggregate bookkeeping all commit together; if any of it fails after the storage
            // object is already saved, compensate below.
            return await unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                if (!await photoRepository.TryCreateAssetAsync(photo.PhotoAsset))
                {
                    // Lost the race: another upload of these exact previously-unseen bytes
                    // created the canonical PhotoAsset first, between the pre-check above and
                    // this insert (see IX_PhotoAssets_OriginalContentHash). The bytes we just
                    // wrote to storage are now redundant — clean them up and fall back to the
                    // same reuse path GetAssetByContentHashAsync above would have taken had it
                    // run a moment later.
                    await photoFileService.TryDeleteOrphanedStorageObjectAsync(storedFile.StorageKey);
                    var winner = await photoRepository.GetAssetByContentHashAsync(storedFile.OriginalContentHash)
                        ?? throw new InvalidOperationException(
                            $"TryCreateAssetAsync reported a hash conflict for hash {storedFile.OriginalContentHash} but no PhotoAsset with that hash was found.");
                    var reused = await ReuseAssetCoreAsync(winner, baulId, chapterId, userId, now, persistRelatedStateAsync);
                    return Result.Success(reused);
                }

                if (!await photoRepository.TryAddExistingAssetAsync(photo))
                    throw new InvalidOperationException(
                        $"TryAddExistingAssetAsync failed right after minting a brand-new PhotoAsset {photo.PhotoAssetId} for baúl {baulId} — should be impossible.");

                await photoRepository.TryCreateUserPhotoAssetAsync(userId, photo.PhotoAssetId, now);
                await persistRelatedStateAsync(photo, now);
                return Result.Success(PhotoUploadOutcome.Created(photo));
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

    // Wraps ReuseAssetCoreAsync in its own transaction — used when the exact-duplicate lookup
    // finds the existing PhotoAsset up front, with no storage write of its own to compensate for.
    private async Task<Result<PhotoUploadOutcome>> ReuseExistingAssetAsync(
        PhotoAsset asset, BaulId baulId, ChapterId? chapterId, UserId userId, DateTime now,
        Func<Photo, DateTime, Task> persistRelatedStateAsync) =>
        await unitOfWork.ExecuteInTransactionAsync(async () =>
            Result.Success(await ReuseAssetCoreAsync(asset, baulId, chapterId, userId, now, persistRelatedStateAsync)));

    // The actual "reuse an existing canonical PhotoAsset" logic (Slice 2.5, docs/.backlog issue
    // #62), shared by the up-front exact-duplicate lookup and the race-lost branch above — always
    // called from inside an ambient transaction (never opens its own). No PhotoAsset is created
    // and no storage write happens here: the asset and its stored bytes already exist.
    private async Task<PhotoUploadOutcome> ReuseAssetCoreAsync(
        PhotoAsset asset, BaulId baulId, ChapterId? chapterId, UserId userId, DateTime now,
        Func<Photo, DateTime, Task> persistRelatedStateAsync)
    {
        // Ensures the current user shows up in Mis fotos for this asset even though they didn't
        // create the PhotoAsset row — the whole point of Slice 2.5's UserPhotoAsset relation.
        // Idempotent: a no-op if the user already has this asset (e.g. re-uploading their own file).
        await photoRepository.TryCreateUserPhotoAssetAsync(userId, asset.Id, now);

        // Recovers the asset's own intrinsic date the same way MyPhotosReadManager and
        // PhotoManager.AddAssetToBaulAsync do: its originating Photo shares its Guid (see
        // Photo.Create's doc comment). Missing only if that Photo was hard-deleted.
        var originatingPhoto = await photoRepository.GetByIdAsync(new PhotoId(asset.Id.Value));

        var newPhoto = Photo.CreateFromExistingAsset(
            new PhotoId(idGenerator.NewId()), baulId, asset, originatingPhoto?.TakenAt, userId, now, chapterId);

        if (await photoRepository.TryAddExistingAssetAsync(newPhoto))
        {
            await persistRelatedStateAsync(newPhoto, now);
            logger.LogInformation(
                "Photo upload reused an existing canonical PhotoAsset {BaulId} {ChapterId} {PhotoAssetId} {NewPhotoId}",
                baulId, chapterId, asset.Id, newPhoto.Id);
            return PhotoUploadOutcome.Created(newPhoto);
        }

        // Idempotent: this asset is already active in the target baúl (this user or someone else
        // already uploaded/added the exact same bytes here) — surface the existing Photo instead
        // of creating a second projection or surfacing a conflict.
        var existingInBaul = await photoRepository.GetActiveByAssetIdAsync(baulId, asset.Id)
            ?? throw new InvalidOperationException(
                $"TryAddExistingAssetAsync reported a conflict for baúl {baulId} asset {asset.Id} but no active photo was found.");
        logger.LogInformation(
            "Photo upload was an exact duplicate already active in this baúl {BaulId} {ChapterId} {PhotoAssetId} {ExistingPhotoId}",
            baulId, chapterId, asset.Id, existingInBaul.Id);
        return PhotoUploadOutcome.Duplicate(existingInBaul);
    }
}
