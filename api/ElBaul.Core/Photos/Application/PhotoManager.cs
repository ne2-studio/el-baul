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
