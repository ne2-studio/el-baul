using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Chapters.Domain;
using ElBaul.Core.Bauls;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
using ElBaul.Core.Shared.Application;
namespace ElBaul.Core.Photos.Application;
public class PhotoManager(
    ILogger<PhotoManager> logger,
    IPhotoRepository photoRepository,
    IChapterRepository chapterRepository,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    PhotoLifecycleService photoLifecycle,
    IPhotoDtoProjector photoDtoProjector,
    PhotoUploadWorkflow photoUploadWorkflow,
    IIdGenerator idGenerator,
    IClock clock,
    IUnitOfWork unitOfWork) : IPhotoManager
{
    public async Task<Result<PhotoDto>> UploadAsync(
        ChapterId chapterId,
        Stream content,
        ClientUploadId clientUploadId,
        Guid? uploadBatchId = null)
    {
        var userId = currentUserProvider.GetUserId();
        var chapterResult = await EntityLookup.ResolveAsync(
            () => chapterRepository.GetByIdAsync(chapterId),
            logger,
            "Photo upload rejected: chapter not found {ChapterId}",
            "Chapter not found",
            chapterId);
        if (chapterResult.IsFailure) return Result.Failure<PhotoDto>(chapterResult.Error);
        var chapter = chapterResult.Value;

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Photo upload", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        return await UploadPhotoAsync(auth.Value.Baul, chapter, content, clientUploadId, userId, auth.Value.IsAdmin, uploadBatchId);
    }

    public async Task<Result<PhotoDto>> UploadToBaulAsync(
        BaulId baulId,
        Stream content,
        ClientUploadId clientUploadId,
        Guid? uploadBatchId = null)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Loose photo upload");
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        return await UploadPhotoAsync(auth.Value.Baul, null, content, clientUploadId, userId, auth.Value.IsAdmin, uploadBatchId);
    }

    private async Task<Result<PhotoDto>> UploadPhotoAsync(
        Baul baul,
        Chapter? chapter,
        Stream content,
        ClientUploadId clientUploadId,
        UserId userId,
        bool isAdmin,
        Guid? uploadBatchId = null)
    {
        var chapterId = chapter?.Id;

        var existingPhoto = await photoRepository.GetByClientUploadIdAsync(clientUploadId);
        if (existingPhoto is not null)
        {
            logger.LogInformation(
                "Duplicate photo upload ignored {BaulId} {ChapterId} {ClientUploadId} {PhotoId}",
                baul.Id, chapterId, clientUploadId, existingPhoto.Id);
            return Result.Success(await photoDtoProjector.ProjectAsync(existingPhoto, isAdmin, userId));
        }

        var uploadResult = await photoUploadWorkflow.CreatePhotoAsync(
            baul.Id, chapterId, userId, content, clientUploadId, uploadBatchId,
            (createdPhoto, now) => photoLifecycle.AddAsync(createdPhoto, chapterId, baul.Id, now));
        if (uploadResult.IsFailure) return Result.Failure<PhotoDto>(uploadResult.Error);
        var outcome = uploadResult.Value;

        if (outcome.AlreadyExisted)
        {
            logger.LogInformation(
                "Photo upload was an exact duplicate {BaulId} {ChapterId} {ExistingPhotoId}", baul.Id, chapterId, outcome.Photo.Id);
        }
        else
        {
            logger.LogInformation("Photo uploaded {BaulId} {ChapterId} {PhotoId}", baul.Id, chapterId, outcome.Photo.Id);
        }

        return await photoDtoProjector.ProjectAsync(outcome.Photo, isAdmin, userId, outcome.AlreadyExisted);
    }

    public async Task<Result<PhotoDto>> MoveAsync(PhotoId photoId, ChapterId targetChapterId)
    {
        var userId = currentUserProvider.GetUserId();
        var photoResult = await EntityLookup.ResolveAsync(
            () => photoRepository.GetByIdAsync(photoId),
            logger,
            "Photo move rejected: photo not found {PhotoId}",
            "Photo not found",
            photoId);
        if (photoResult.IsFailure) return Result.Failure<PhotoDto>(photoResult.Error);
        var photo = photoResult.Value;

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo move", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        var targetChapterResult = await EntityLookup.ResolveAsync(
            () => chapterRepository.GetByIdAsync(targetChapterId),
            targetChapter => targetChapter.BaulId == photo.BaulId,
            logger,
            "Photo move rejected: target chapter not found {BaulId} {PhotoId} {TargetChapterId}",
            "Target chapter not found",
            photo.BaulId,
            photoId,
            targetChapterId);
        if (targetChapterResult.IsFailure) return Result.Failure<PhotoDto>(targetChapterResult.Error);

        if (photo.ChapterId == targetChapterId)
        {
            logger.LogWarning(
                "Photo move rejected: photo already in target chapter {BaulId} {PhotoId} {TargetChapterId}",
                photo.BaulId, photoId, targetChapterId);
            return Result.Failure<PhotoDto>(ApplicationError.Validation("Photo is already in that chapter"));
        }

        // Source-chapter removal, photo reassignment and target-chapter addition commit
        // together — a photo whose ChapterId points somewhere its PhotoCount doesn't reflect
        // is exactly the partial-write state this port exists to prevent.
        var moveResult = await unitOfWork.ExecuteInTransactionAsync(async () =>
            Result.Success(await photoLifecycle.MoveAsync(photo, photo.ChapterId, targetChapterId)));
        var updatedPhoto = moveResult.Value;

        logger.LogInformation(
            "Photo moved {BaulId} {PhotoId} {SourceChapterId} {TargetChapterId}",
            photo.BaulId, photoId, photo.ChapterId, targetChapterId);

        return await photoDtoProjector.ProjectAsync(updatedPhoto, auth.Value.IsAdmin, userId);
    }

    // "Add to another baúl" (docs/.backlog issue #62, Slice 2). Deliberately takes only
    // SourcePhotoId + TargetBaulId, never a PhotoAssetId directly — the capability comes from
    // being authorized to view an existing Photo, not from knowing an internal asset identifier
    // (see IPhotoManager's doc comment).
    public async Task<Result<PhotoDto>> AddToBaulAsync(PhotoId sourcePhotoId, BaulId targetBaulId)
    {
        var userId = currentUserProvider.GetUserId();
        var sourcePhotoResult = await EntityLookup.ResolveAsync(
            () => photoRepository.GetByIdAsync(sourcePhotoId),
            logger,
            "Add photo to baul rejected: source photo not found {PhotoId}",
            "Photo not found",
            sourcePhotoId);
        if (sourcePhotoResult.IsFailure) return Result.Failure<PhotoDto>(sourcePhotoResult.Error);
        var sourcePhoto = sourcePhotoResult.Value;

        // 1. the caller must be allowed to view the source photo...
        var sourceAuth = await baulAccess.AuthorizeAsync(
            sourcePhoto.BaulId, userId, AccessLevel.Member, "Add photo to baul (source)",
            new { sourcePhoto.BaulId, PhotoId = sourcePhotoId });
        if (sourceAuth.IsFailure) return Result.Failure<PhotoDto>(sourceAuth.Error);

        // 2. ...and allowed to add content to the target baúl — the same level a normal upload
        // requires (see UploadToBaulAsync). Never PhotoAsset authorization: access is always
        // mediated by an authorized Photo, PhotoAsset itself has none of its own.
        var targetAuth = await baulAccess.AuthorizeAsync(
            targetBaulId, userId, AccessLevel.Member, "Add photo to baul (target)",
            new { SourcePhotoId = sourcePhotoId, TargetBaulId = targetBaulId });
        if (targetAuth.IsFailure) return Result.Failure<PhotoDto>(targetAuth.Error);

        var now = clock.UtcNow();
        var newPhoto = Photo.CreateFromExistingAsset(
            new PhotoId(idGenerator.NewId()), targetBaulId, sourcePhoto.PhotoAsset, sourcePhoto.TakenAt, userId, now);

        var (resultPhoto, isNew) = await AddExistingAssetAsync(newPhoto, targetBaulId, sourcePhoto.PhotoAssetId);

        if (isNew)
        {
            logger.LogInformation(
                "Photo added to another baúl {SourcePhotoId} {TargetBaulId} {NewPhotoId}", sourcePhotoId, targetBaulId, resultPhoto.Id);
        }
        else
        {
            logger.LogInformation(
                "Add photo to baul was a no-op: asset already active in target baúl {SourcePhotoId} {TargetBaulId} {ExistingPhotoId}",
                sourcePhotoId, targetBaulId, resultPhoto.Id);
        }

        return await photoDtoProjector.ProjectAsync(resultPhoto, targetAuth.Value.IsAdmin, userId);
    }

    // "Add to another baúl" from Mis fotos (docs/.backlog issue #62, Slice 2 — Mis fotos
    // wiring). Same domain factory/transaction/DB constraint as AddToBaulAsync above, but
    // authorized differently: there is no source Photo to prove access through, since Mis fotos
    // shows a PhotoAsset with no baúl of its own. Instead the caller must be the asset's
    // original uploader — the same rule MyPhotosReadManager uses to decide what belongs in Mis
    // fotos at all — never PhotoAsset access mediated by some other baúl's Photo.
    public async Task<Result<BaulAppearanceDto>> AddAssetToBaulAsync(PhotoAssetId assetId, BaulId targetBaulId)
    {
        var userId = currentUserProvider.GetUserId();
        var assetResult = await EntityLookup.ResolveAsync(
            () => photoRepository.GetAssetByIdAsync(assetId),
            logger,
            "Add asset to baul rejected: asset not found {PhotoAssetId}",
            "Photo not found",
            assetId);
        if (assetResult.IsFailure) return Result.Failure<BaulAppearanceDto>(assetResult.Error);
        var asset = assetResult.Value;

        // Slice 2.5 (docs/.backlog issue #62): authorizes off the caller's own UserPhotoAsset
        // relation, not PhotoAsset.UploadedBy — several users can each independently contribute
        // the exact same bytes (see PhotoUploadWorkflow's exact-duplicate reuse), and every one
        // of them must be able to add "their" asset from Mis fotos, not just whoever happened to
        // create the PhotoAsset row first.
        if (!await photoRepository.HasUserPhotoAssetAsync(userId, assetId))
        {
            logger.LogWarning(
                "Add asset to baul rejected: access denied {@Context}", new { PhotoAssetId = assetId, TargetBaulId = targetBaulId });
            return Result.Failure<BaulAppearanceDto>(ApplicationError.Forbidden("Access denied"));
        }

        var targetAuth = await baulAccess.AuthorizeAsync(
            targetBaulId, userId, AccessLevel.Member, "Add asset to baul (target)",
            new { PhotoAssetId = assetId, TargetBaulId = targetBaulId });
        if (targetAuth.IsFailure) return Result.Failure<BaulAppearanceDto>(targetAuth.Error);

        // The asset's own originating Photo shares its Guid (see Photo.Create) — same trick
        // MyPhotosReadManager uses to recover the asset's intrinsic date. Missing only if every
        // Photo that ever referenced this asset was hard-deleted; TakenAt then just starts
        // unset, same as any other brand-new projection.
        var originatingPhoto = await photoRepository.GetByIdAsync(new PhotoId(assetId.Value));

        var now = clock.UtcNow();
        var newPhoto = Photo.CreateFromExistingAsset(
            new PhotoId(idGenerator.NewId()), targetBaulId, asset, originatingPhoto?.TakenAt, userId, now);

        var (resultPhoto, isNew) = await AddExistingAssetAsync(newPhoto, targetBaulId, assetId);

        if (isNew)
        {
            logger.LogInformation(
                "Asset added to another baúl {PhotoAssetId} {TargetBaulId} {NewPhotoId}", assetId, targetBaulId, resultPhoto.Id);
        }
        else
        {
            logger.LogInformation(
                "Add asset to baul was a no-op: asset already active in target baúl {PhotoAssetId} {TargetBaulId} {ExistingPhotoId}",
                assetId, targetBaulId, resultPhoto.Id);
        }

        return Result.Success(new BaulAppearanceDto(targetBaulId.ToString(), targetAuth.Value.Baul.Name));
    }

    // Shared by AddToBaulAsync and AddAssetToBaulAsync — TryAddExistingAssetAsync + the
    // chapter/cover bookkeeping it triggers commit together, same shape as UploadAsync's
    // transaction. Both callers land on the exact same race-safe idempotency: a lost race, or
    // simply already being there, resolves to the existing active Photo rather than a database
    // constraint error leaking out — see IPhotoManager's doc comments.
    private async Task<(Photo Photo, bool IsNew)> AddExistingAssetAsync(Photo newPhoto, BaulId targetBaulId, PhotoAssetId assetId)
    {
        var addResult = await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (await photoRepository.TryAddExistingAssetAsync(newPhoto))
            {
                await photoLifecycle.AddAsync(newPhoto, chapterId: null, targetBaulId, newPhoto.CreatedAt);
                return Result.Success((Photo: newPhoto, IsNew: true));
            }

            var existing = await photoRepository.GetActiveByAssetIdAsync(targetBaulId, assetId)
                ?? throw new InvalidOperationException(
                    $"TryAddExistingAssetAsync reported a conflict for baúl {targetBaulId} asset {assetId} but no active photo was found.");
            return Result.Success((Photo: existing, IsNew: false));
        });
        return addResult.Value;
    }

    public async Task<Result> DeleteAsync(PhotoId photoId, string? reason)
    {
        var userId = currentUserProvider.GetUserId();
        var photoResult = await EntityLookup.ResolveAsync(
            () => photoRepository.GetByIdAsync(photoId),
            logger,
            "Photo delete rejected: photo not found {PhotoId}",
            "Photo not found",
            photoId);
        if (photoResult.IsFailure) return Result.Failure(photoResult.Error);
        var photo = photoResult.Value;

        // Member-level, not Admin-only: PhotoDeletePolicy below is the actual gate — an
        // administrador/custodio can always delete, anyone else only within the grace period on
        // their own upload. Kept in lockstep with PhotoDtoProjector's CanDelete flag so the menu
        // option the frontend showed is always backed by a request the backend will accept.
        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo delete", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        if (!PhotoDeletePolicy.CanDelete(photo, userId, auth.Value.IsAdmin, clock.UtcNow()))
        {
            logger.LogWarning(
                "Photo delete rejected: access denied {@Context}", new { photo.BaulId, PhotoId = photoId });
            return Result.Failure(ApplicationError.Forbidden("Access denied"));
        }

        // Photo status, source-chapter removal and baúl cover clearing commit together — see
        // PhotoLifecycleService.SoftDeleteAsync for what it touches.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await photoLifecycle.SoftDeleteAsync(photo, reason);
            return Result.Success();
        });

        logger.LogInformation("Photo deleted {BaulId} {PhotoId}", photo.BaulId, photoId);
        return Result.Success();
    }

    // Same best-effort skip-and-log semantics as ChangeDateBatchAsync below — see its comment.
    public async Task<Result> DeleteBatchAsync(IEnumerable<PhotoId> photoIds, string? reason)
    {
        foreach (var photoId in photoIds)
        {
            var result = await DeleteAsync(photoId, reason);
            if (result.IsFailure)
            {
                logger.LogWarning("Skipping photo in batch delete {PhotoId}: {Error}", photoId, result.Error);
            }
        }

        return Result.Success();
    }

    public async Task<Result<PhotoDto>> ChangeDateAsync(PhotoId photoId, PhotoDate date)
    {
        var userId = currentUserProvider.GetUserId();
        var photoResult = await EntityLookup.ResolveAsync(
            () => photoRepository.GetByIdAsync(photoId),
            logger,
            "Photo date change rejected: photo not found {PhotoId}",
            "Photo not found",
            photoId);
        if (photoResult.IsFailure) return Result.Failure<PhotoDto>(photoResult.Error);
        var photo = photoResult.Value;

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo date change", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        var updatedPhoto = photo.WithDate(date);
        await photoRepository.UpdateAsync(updatedPhoto);

        logger.LogInformation("Photo date changed {BaulId} {PhotoId}", photo.BaulId, photoId);

        return await photoDtoProjector.ProjectAsync(updatedPhoto, auth.Value.IsAdmin, userId);
    }

    public async Task<Result<PhotoDto>> ClearDateAsync(PhotoId photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var photoResult = await EntityLookup.ResolveAsync(
            () => photoRepository.GetByIdAsync(photoId),
            logger,
            "Photo date clear rejected: photo not found {PhotoId}",
            "Photo not found",
            photoId);
        if (photoResult.IsFailure) return Result.Failure<PhotoDto>(photoResult.Error);
        var photo = photoResult.Value;

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo date clear", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        var updatedPhoto = photo.WithDate(null);
        await photoRepository.UpdateAsync(updatedPhoto);

        logger.LogInformation("Photo date cleared {BaulId} {PhotoId}", photo.BaulId, photoId);

        return await photoDtoProjector.ProjectAsync(updatedPhoto, auth.Value.IsAdmin, userId);
    }

    // Deliberately not wrapped in IUnitOfWork.ExecuteInTransactionAsync despite looping over
    // N writes — unlike every transactional method in this codebase, this one is intentionally
    // best-effort: a photo that fails validation (not found, access denied) is logged and
    // skipped, not treated as a reason to abort the rest of the batch. Wrapping this loop in a
    // transaction would flip that semantic — ExecuteInTransactionAsync rolls back the whole
    // operation on any Result.Failure, which here would turn "skip the one bad photo" into
    // "discard every date change in the batch because of one bad photo".
    public async Task<Result<IEnumerable<PhotoDto>>> ChangeDateBatchAsync(IEnumerable<PhotoId> photoIds, PhotoDate date)
    {
        var updated = new List<PhotoDto>();
        foreach (var photoId in photoIds)
        {
            var result = await ChangeDateAsync(photoId, date);
            if (result.IsSuccess)
            {
                updated.Add(result.Value);
            }
            else
            {
                logger.LogWarning("Skipping photo in batch date change {PhotoId}: {Error}", photoId, result.Error);
            }
        }

        return Result.Success<IEnumerable<PhotoDto>>(updated);
    }

    // Same best-effort skip-and-log semantics as ChangeDateBatchAsync above — see its comment.
    public async Task<Result<IEnumerable<PhotoDto>>> ClearDateBatchAsync(IEnumerable<PhotoId> photoIds)
    {
        var updated = new List<PhotoDto>();
        foreach (var photoId in photoIds)
        {
            var result = await ClearDateAsync(photoId);
            if (result.IsSuccess)
            {
                updated.Add(result.Value);
            }
            else
            {
                logger.LogWarning("Skipping photo in batch date clear {PhotoId}: {Error}", photoId, result.Error);
            }
        }

        return Result.Success<IEnumerable<PhotoDto>>(updated);
    }

    public async Task<Result<PhotoDto>> ConfirmNoPersonasAsync(PhotoId photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var photoResult = await EntityLookup.ResolveAsync(
            () => photoRepository.GetByIdAsync(photoId),
            logger,
            "Photo confirm-no-personas rejected: photo not found {PhotoId}",
            "Photo not found",
            photoId);
        if (photoResult.IsFailure) return Result.Failure<PhotoDto>(photoResult.Error);
        var photo = photoResult.Value;

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo confirm no personas", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        var updatedPhoto = photo.WithConfirmedNoPersonas(true);
        await photoRepository.UpdateAsync(updatedPhoto);

        logger.LogInformation("Photo confirmed as having no personas {BaulId} {PhotoId}", photo.BaulId, photoId);

        return await photoDtoProjector.ProjectAsync(updatedPhoto, auth.Value.IsAdmin, userId);
    }
}
