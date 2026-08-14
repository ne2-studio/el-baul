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
public class PhotoReadManager(
    ILogger<PhotoReadManager> logger,
    IPhotoRepository photoRepository,
    IPhotoListReadModel photoListReadModel,
    IChapterRepository chapterRepository,
    IBaulRepository baulRepository,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    IPhotoDtoProjector photoDtoProjector,
    PhotoFileService photoFileService,
    IPhotoUploadBatchReadModel photoUploadBatchReadModel,
    IAppConfiguration appConfiguration) : IPhotoReadManager
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

    public async Task<Result<PhotoDto?>> GetMemorySuggestionAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Memory photo suggestion");
        if (auth.IsFailure) return Result.Failure<PhotoDto?>(auth.Error);

        var row = await photoListReadModel.GetMemorySuggestionAsync(baulId);
        if (row is null) return Result.Success<PhotoDto?>(null);

        var dtos = await photoDtoProjector.ProjectAsync([row], auth.Value.IsAdmin, userId);
        return Result.Success<PhotoDto?>(dtos[0]);
    }

    public async Task<Result<IEnumerable<PhotoDto>>> GetBatchPhotosAsync(BaulId baulId, Guid batchId)
    {
        if (!appConfiguration.BaulFeedEnabled)
        {
            logger.LogWarning("Photo batch photos rejected: feed is not enabled {BatchId}", batchId);
            return Result.Failure<IEnumerable<PhotoDto>>(ApplicationError.Validation("Baul feed is not enabled"));
        }

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Photo batch photos", new { BaulId = baulId, BatchId = batchId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(auth.Error);

        var rows = await photoUploadBatchReadModel.GetPhotosByBatchIdAsync(baulId, batchId);
        if (rows.Count == 0)
        {
            logger.LogWarning("Photo batch photos rejected: batch not found {BatchId}", batchId);
            return Result.Failure<IEnumerable<PhotoDto>>(ApplicationError.NotFound("Photo batch not found"));
        }

        var dtos = await photoDtoProjector.ProjectAsync(rows, auth.Value.IsAdmin, userId);
        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }
}
