using ElBaul.Application.Bauls;
using ElBaul.InputPorts.Photos;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Photos;
public class PhotoManager(
    ILogger<PhotoManager> logger,
    IPhotoRepository photoRepository,
    IPhotoListReadModel photoListReadModel,
    IChapterRepository chapterRepository,
    IBaulRepository baulRepository,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    PhotoLifecycleService photoLifecycle,
    IPhotoDtoProjector photoDtoProjector,
    PhotoFileService photoFileService,
    PhotoUploadWorkflow photoUploadWorkflow,
    IClock clock,
    IUnitOfWork unitOfWork) : IPhotoManager
{
    public async Task<Result<IEnumerable<PhotoDto>>> GetByChapterIdAsync(ChapterId chapterId)
    {
        var userId = currentUserProvider.GetUserId();
        var chapterResult = await EntityLookup.ResolveAsync(
            () => chapterRepository.GetByIdAsync(chapterId),
            logger,
            "Photos by chapter rejected: chapter not found {ChapterId}",
            "Chapter not found",
            chapterId);
        if (chapterResult.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(chapterResult.Error);
        var chapter = chapterResult.Value;

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Photos by chapter", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(auth.Error);

        var rows = await photoListReadModel.GetByChapterIdAsync(chapterId);
        var dtos = await photoDtoProjector.ProjectAsync(rows, auth.Value.IsAdmin, userId);

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    public async Task<Result<IEnumerable<PhotoDto>>> GetLooseByBaulIdAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Loose photos");
        if (auth.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(auth.Error);

        var rows = await photoListReadModel.GetLooseByBaulIdAsync(baulId);
        var dtos = await photoDtoProjector.ProjectAsync(rows, auth.Value.IsAdmin, userId);

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    public async Task<Result<PhotoPageDto>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take)
    {
        var userId = currentUserProvider.GetUserId();

        if (chapterId is { } wantedChapterId)
        {
            var chapterResult = await EntityLookup.ResolveAsync(
                () => chapterRepository.GetByIdAsync(wantedChapterId),
                chapter => chapter.BaulId == baulId,
                logger,
                "Photo page rejected: chapter not found {BaulId} {ChapterId}",
                "Chapter not found",
                baulId,
                wantedChapterId);
            if (chapterResult.IsFailure) return Result.Failure<PhotoPageDto>(chapterResult.Error);
        }

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Photo page", new { BaulId = baulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<PhotoPageDto>(auth.Error);

        var clampedTake = Math.Clamp(take, 1, 100);
        var page = (await photoListReadModel.GetPageAsync(baulId, chapterId, skip, clampedTake + 1)).ToList();
        var hasMore = page.Count > clampedTake;
        var rows = hasMore ? page.Take(clampedTake).ToList() : page;

        var dtos = await photoDtoProjector.ProjectAsync(rows, auth.Value.IsAdmin, userId);

        return Result.Success(new PhotoPageDto(dtos, hasMore));
    }

    public async Task<Result<PhotoDto>> UploadAsync(
        ChapterId chapterId,
        Stream content,
        string fileName,
        string contentType,
        PhotoDate? date,
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

        return await UploadPhotoAsync(auth.Value.Baul, chapter, content, fileName, contentType, date, clientUploadId, userId, auth.Value.IsAdmin, uploadBatchId);
    }

    public async Task<Result<PhotoDto>> UploadToBaulAsync(
        BaulId baulId,
        Stream content,
        string fileName,
        string contentType,
        PhotoDate? date,
        ClientUploadId clientUploadId,
        Guid? uploadBatchId = null)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Loose photo upload");
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        return await UploadPhotoAsync(auth.Value.Baul, null, content, fileName, contentType, date, clientUploadId, userId, auth.Value.IsAdmin, uploadBatchId);
    }

    private async Task<Result<PhotoDto>> UploadPhotoAsync(
        Baul baul,
        Chapter? chapter,
        Stream content,
        string fileName,
        string contentType,
        PhotoDate? date,
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

        var photo = await photoUploadWorkflow.CreatePhotoAsync(
            baul.Id, chapterId, userId, content, fileName, contentType, date, clientUploadId, uploadBatchId,
            (createdPhoto, now) => photoLifecycle.AddAsync(createdPhoto, chapter, baul, now));

        logger.LogInformation("Photo uploaded {BaulId} {ChapterId} {PhotoId}", baul.Id, chapterId, photo.Id);

        return await photoDtoProjector.ProjectAsync(photo, isAdmin, userId);
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
        var targetChapter = targetChapterResult.Value;

        if (photo.ChapterId == targetChapterId)
        {
            logger.LogWarning(
                "Photo move rejected: photo already in target chapter {BaulId} {PhotoId} {TargetChapterId}",
                photo.BaulId, photoId, targetChapterId);
            return Result.Failure<PhotoDto>(ApplicationError.Validation("Photo is already in that chapter"));
        }

        Chapter? sourceChapter = null;
        if (photo.ChapterId is { } sourceChapterId)
        {
            sourceChapter = await chapterRepository.GetByIdAsync(sourceChapterId);
        }

        // Source-chapter removal, photo reassignment and target-chapter addition commit
        // together — a photo whose ChapterId points somewhere its PhotoCount doesn't reflect
        // is exactly the partial-write state this port exists to prevent.
        var moveResult = await unitOfWork.ExecuteInTransactionAsync(async () =>
            Result.Success(await photoLifecycle.MoveAsync(photo, sourceChapter, targetChapter)));
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

    public async Task<Result<PhotoDownloadResult>> DownloadAsync(PhotoId photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var photoResult = await EntityLookup.ResolveAsync(
            () => photoRepository.GetByIdAsync(photoId),
            logger,
            "Photo download rejected: photo not found {PhotoId}",
            "Photo not found",
            photoId);
        if (photoResult.IsFailure) return Result.Failure<PhotoDownloadResult>(photoResult.Error);
        var photo = photoResult.Value;

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo download", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDownloadResult>(auth.Error);

        return await photoFileService.OpenForDownloadAsync(photo.StorageKey);
    }

    public async Task<Result<IEnumerable<PhotoDto>>> GetByPersonaIdAsync(BaulId baulId, PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Photos by persona", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(auth.Error);

        var personaResult = await EntityLookup.ResolveAsync(
            () => baulRepository.GetPersonaByIdAsync(personaId),
            persona => persona.BaulId == baulId,
            logger,
            "Photos by persona rejected: persona not found {BaulId} {PersonaId}",
            "Persona not found",
            baulId,
            personaId);
        if (personaResult.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(personaResult.Error);

        var photoIds = await photoPersonaTagRepository.GetPhotoIdsByPersonaIdAsync(personaId);
        var rows = await photoListReadModel.GetActiveByIdsAsync(baulId, photoIds);
        var dtos = await photoDtoProjector.ProjectAsync(rows, auth.Value.IsAdmin, userId);

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
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

    public async Task<Result<PhotoDto?>> GetUntaggedSuggestionAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Untagged photo suggestion");
        if (auth.IsFailure) return Result.Failure<PhotoDto?>(auth.Error);

        var row = await photoListReadModel.GetUntaggedSuggestionAsync(baulId);
        if (row is null) return Result.Success<PhotoDto?>(null);

        var dtos = await photoDtoProjector.ProjectAsync([row], auth.Value.IsAdmin, userId);
        return Result.Success<PhotoDto?>(dtos[0]);
    }

}
