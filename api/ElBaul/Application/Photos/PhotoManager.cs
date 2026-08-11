using ElBaul.Application.Bauls;
using ElBaul.Application.Photos;
using ElBaul.InputPorts.Photos;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Personas;
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
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    PhotoLifecycleService photoLifecycle,
    IPhotoDtoProjector photoDtoProjector,
    PhotoFileService photoFileService,
    IUnitOfWork unitOfWork) : IPhotoManager
{
    public async Task<Result<IEnumerable<PhotoDto>>> GetByChapterIdAsync(ChapterId chapterId)
    {
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null) return Result.Failure<IEnumerable<PhotoDto>>(ApplicationError.NotFound("Chapter not found"));

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Photos by chapter", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(auth.Error);

        var rows = await photoListReadModel.GetByChapterIdAsync(chapterId);
        var dtos = await photoDtoProjector.ProjectAsync(rows);

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    public async Task<Result<IEnumerable<PhotoDto>>> GetLooseByBaulIdAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Loose photos", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(auth.Error);

        var rows = await photoListReadModel.GetLooseByBaulIdAsync(baulId);
        var dtos = await photoDtoProjector.ProjectAsync(rows);

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    public async Task<Result<PhotoPageDto>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take)
    {
        var userId = currentUserProvider.GetUserId();

        if (chapterId is { } wantedChapterId)
        {
            var chapter = await chapterRepository.GetByIdAsync(wantedChapterId);
            if (chapter is null || chapter.BaulId != baulId) return Result.Failure<PhotoPageDto>(ApplicationError.NotFound("Chapter not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Photo page", new { BaulId = baulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<PhotoPageDto>(auth.Error);

        var clampedTake = Math.Clamp(take, 1, 100);
        var page = (await photoListReadModel.GetPageAsync(baulId, chapterId, skip, clampedTake + 1)).ToList();
        var hasMore = page.Count > clampedTake;
        var rows = hasMore ? page.Take(clampedTake).ToList() : page;

        var dtos = await photoDtoProjector.ProjectAsync(rows);

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
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null)
        {
            logger.LogWarning("Photo upload rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure<PhotoDto>(ApplicationError.NotFound("Chapter not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Photo upload", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        return await UploadPhotoAsync(auth.Value.Baul, chapter, content, fileName, contentType, date, clientUploadId, userId, uploadBatchId);
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

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Loose photo upload", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        return await UploadPhotoAsync(auth.Value.Baul, null, content, fileName, contentType, date, clientUploadId, userId, uploadBatchId);
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
        Guid? uploadBatchId = null)
    {
        var chapterId = chapter?.Id;

        var existingPhoto = await photoRepository.GetByClientUploadIdAsync(clientUploadId);
        if (existingPhoto is not null)
        {
            logger.LogInformation(
                "Duplicate photo upload ignored {BaulId} {ChapterId} {ClientUploadId} {PhotoId}",
                baul.Id, chapterId, clientUploadId, existingPhoto.Id);
            return Result.Success(await photoDtoProjector.ProjectAsync(existingPhoto));
        }

        var now = clock.UtcNow();
        StoredPhotoFile storedFile;

        try
        {
            storedFile = await photoFileService.SaveForUploadAsync(userId, fileName, contentType, content, date);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while saving to storage {BaulId} {ChapterId} {FileName} {ContentType}",
                baul.Id, chapterId, fileName, contentType);
            throw;
        }

        var photo = Photo.Create(
            new PhotoId(idGenerator.NewId()), chapterId, baul.Id, storedFile.StorageKey, storedFile.Date, userId, now,
            clientUploadId, storedFile.SizeBytes, uploadBatchId);

        try
        {
            // One transaction: a photo row that exists without its chapter/baul cover having
            // been updated (or vice versa) is exactly the partial-write state this port exists
            // to prevent. If this throws, the photo row itself never lands either, so the
            // now-orphaned storage object below always needs cleaning up on failure.
            await unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await photoRepository.CreateAsync(photo);
                await photoLifecycle.AddAsync(photo, chapter, baul, now);
                return Result.Success();
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Photo upload failed while persisting photo/chapter/baul state {BaulId} {ChapterId} {PhotoId} {StorageKey}",
                baul.Id, chapterId, photo.Id, storedFile.StorageKey);
            await photoFileService.TryDeleteOrphanedStorageObjectAsync(storedFile.StorageKey);
            throw;
        }

        logger.LogInformation("Photo uploaded {BaulId} {ChapterId} {PhotoId}", baul.Id, chapterId, photo.Id);

        return await photoDtoProjector.ProjectAsync(photo);
    }

    public async Task<Result<PhotoDto>> MoveAsync(PhotoId photoId, ChapterId targetChapterId)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Photo move rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<PhotoDto>(ApplicationError.NotFound("Photo not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo move", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        var targetChapter = await chapterRepository.GetByIdAsync(targetChapterId);
        if (targetChapter is null || targetChapter.BaulId != photo.BaulId)
        {
            logger.LogWarning(
                "Photo move rejected: target chapter not found {BaulId} {PhotoId} {TargetChapterId}",
                photo.BaulId, photoId, targetChapterId);
            return Result.Failure<PhotoDto>(ApplicationError.NotFound("Target chapter not found"));
        }

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

        return await photoDtoProjector.ProjectAsync(updatedPhoto);
    }

    public async Task<Result> DeleteAsync(PhotoId photoId, string? reason)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Photo delete rejected: photo not found {PhotoId}", photoId);
            return Result.Failure(ApplicationError.NotFound("Photo not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Admin, "Photo delete", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

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
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Photo date change rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<PhotoDto>(ApplicationError.NotFound("Photo not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo date change", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        var updatedPhoto = photo.WithDate(date);
        await photoRepository.UpdateAsync(updatedPhoto);

        logger.LogInformation("Photo date changed {BaulId} {PhotoId}", photo.BaulId, photoId);

        return await photoDtoProjector.ProjectAsync(updatedPhoto);
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
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Photo download rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<PhotoDownloadResult>(ApplicationError.NotFound("Photo not found"));
        }

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

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId) return Result.Failure<IEnumerable<PhotoDto>>(ApplicationError.NotFound("Persona not found"));

        var photoIds = await photoPersonaTagRepository.GetPhotoIdsByPersonaIdAsync(personaId);
        var rows = await photoListReadModel.GetActiveByIdsAsync(baulId, photoIds);
        var dtos = await photoDtoProjector.ProjectAsync(rows);

        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    public async Task<Result<PhotoDto>> ConfirmNoPersonasAsync(PhotoId photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Photo confirm-no-personas rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<PhotoDto>(ApplicationError.NotFound("Photo not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo confirm no personas", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<PhotoDto>(auth.Error);

        var updatedPhoto = photo.WithConfirmedNoPersonas(true);
        await photoRepository.UpdateAsync(updatedPhoto);

        logger.LogInformation("Photo confirmed as having no personas {BaulId} {PhotoId}", photo.BaulId, photoId);

        return await photoDtoProjector.ProjectAsync(updatedPhoto);
    }

    public async Task<Result<PhotoDto?>> GetUntaggedSuggestionAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Untagged photo suggestion", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<PhotoDto?>(auth.Error);

        var row = await photoListReadModel.GetUntaggedSuggestionAsync(baulId);
        if (row is null) return Result.Success<PhotoDto?>(null);

        var dtos = await photoDtoProjector.ProjectAsync([row]);
        return Result.Success<PhotoDto?>(dtos[0]);
    }

}
