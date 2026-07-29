using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

public class RecuerdoManager(
    ILogger<RecuerdoManager> logger,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IRecuerdoEmbeddingRepository recuerdoEmbeddingRepository,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IPhotoStorage photoStorage,
    BaulAccessService baulAccess) : IRecuerdoManager
{
    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Baul recuerdos", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(auth.Error);

        var recuerdos = (await recuerdoRepository.GetByBaulIdAsync(baulId)).ToList();

        var chapterNames = (await chapterRepository.GetByBaulIdAsync(baulId)).ToDictionary(a => a.Id, a => a.Name);

        var photoIds = recuerdos.Where(r => r.PhotoId is not null).Select(r => r.PhotoId!.Value).Distinct().ToList();
        var thumbnailUrls = new Dictionary<PhotoId, string>();
        foreach (var photoId in photoIds)
        {
            var photo = await photoRepository.GetByIdAsync(photoId);
            if (photo is not null)
                thumbnailUrls[photoId] = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
        }

        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var (nickname, avatarUrl, personaId) = await baulAccess.GetAuthorInfoAsync(baulId, recuerdo.UserId, photoStorage);
            var thumbnailUrl = recuerdo.PhotoId is { } photoId ? thumbnailUrls.GetValueOrDefault(photoId) : null;
            var chapterName = recuerdo.ChapterId is { } chapterId ? chapterNames.GetValueOrDefault(chapterId) : null;
            dtos.Add(ToDto(recuerdo, nickname, avatarUrl, personaId, recuerdo.UserId == userId, thumbnailUrl, chapterName));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(BaulId baulId, string text)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Recuerdo creation", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<RecuerdoDto>(auth.Error);

        var (nickname, avatarUrl, personaId) = await baulAccess.GetAuthorInfoAsync(baulId, userId, photoStorage);
        var recuerdo = new Recuerdo(new RecuerdoId(idGenerator.NewId()), null, null, baulId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation("Recuerdo created {BaulId} {RecuerdoId}", baulId, recuerdo.Id);

        return ToDto(recuerdo, nickname, avatarUrl, personaId, isOwn: true, photoThumbnailUrl: null, chapterName: null);
    }

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(ChapterId chapterId)
    {
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null) return Result.Failure<IEnumerable<RecuerdoDto>>(ApplicationError.NotFound("Chapter not found"));

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Chapter recuerdos", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(auth.Error);

        var recuerdos = (await recuerdoRepository.GetByChapterIdAsync(chapterId)).ToList();

        var photoIds = recuerdos.Where(r => r.PhotoId is not null).Select(r => r.PhotoId!.Value).Distinct().ToList();
        var thumbnailUrls = new Dictionary<PhotoId, string>();
        foreach (var photoId in photoIds)
        {
            var photo = await photoRepository.GetByIdAsync(photoId);
            if (photo is not null)
                thumbnailUrls[photoId] = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
        }

        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var (nickname, avatarUrl, personaId) = await baulAccess.GetAuthorInfoAsync(chapter.BaulId, recuerdo.UserId, photoStorage);
            var thumbnailUrl = recuerdo.PhotoId is { } photoId ? thumbnailUrls.GetValueOrDefault(photoId) : null;
            dtos.Add(ToDto(recuerdo, nickname, avatarUrl, personaId, recuerdo.UserId == userId, thumbnailUrl, chapter.Name));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(ChapterId chapterId, string text)
    {
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null)
        {
            logger.LogWarning("Recuerdo creation rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure<RecuerdoDto>(ApplicationError.NotFound("Chapter not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Recuerdo creation", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<RecuerdoDto>(auth.Error);

        var (nickname, avatarUrl, personaId) = await baulAccess.GetAuthorInfoAsync(chapter.BaulId, userId, photoStorage);
        var recuerdo = new Recuerdo(new RecuerdoId(idGenerator.NewId()), null, chapterId, chapter.BaulId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation("Recuerdo created {BaulId} {ChapterId} {RecuerdoId}", chapter.BaulId, chapterId, recuerdo.Id);

        return ToDto(recuerdo, nickname, avatarUrl, personaId, isOwn: true, photoThumbnailUrl: null, chapterName: chapter.Name);
    }

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(PhotoId photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null) return Result.Failure<IEnumerable<RecuerdoDto>>(ApplicationError.NotFound("Photo not found"));

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo recuerdos", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(auth.Error);

        var recuerdos = await recuerdoRepository.GetByPhotoIdAsync(photoId);
        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var (nickname, avatarUrl, personaId) = await baulAccess.GetAuthorInfoAsync(photo.BaulId, recuerdo.UserId, photoStorage);
            dtos.Add(ToDto(recuerdo, nickname, avatarUrl, personaId, recuerdo.UserId == userId));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(PhotoId photoId, string text)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Recuerdo creation rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<RecuerdoDto>(ApplicationError.NotFound("Photo not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Recuerdo creation", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<RecuerdoDto>(auth.Error);

        var (nickname, avatarUrl, personaId) = await baulAccess.GetAuthorInfoAsync(photo.BaulId, userId, photoStorage);
        var recuerdo = new Recuerdo(new RecuerdoId(idGenerator.NewId()), photoId, photo.ChapterId, photo.BaulId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation(
            "Recuerdo created {BaulId} {PhotoId} {RecuerdoId}", photo.BaulId, photoId, recuerdo.Id);

        return ToDto(recuerdo, nickname, avatarUrl, personaId, isOwn: true);
    }

    public async Task<Result<RecuerdoDto>> UpdateRecuerdoAsync(RecuerdoId recuerdoId, string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return Result.Failure<RecuerdoDto>(ApplicationError.Validation("Text is required"));

        var userId = currentUserProvider.GetUserId();
        var recuerdo = await recuerdoRepository.GetByIdAsync(recuerdoId);
        if (recuerdo is null)
            return Result.Failure<RecuerdoDto>(ApplicationError.NotFound("Recuerdo not found"));

        var auth = await baulAccess.AuthorizeAsync(
            recuerdo.BaulId, userId, AccessLevel.Member, "Recuerdo update", new { recuerdo.BaulId, RecuerdoId = recuerdoId });
        if (auth.IsFailure) return Result.Failure<RecuerdoDto>(auth.Error);

        if (recuerdo.UserId != userId)
            return Result.Failure<RecuerdoDto>(ApplicationError.Forbidden("Only the author can edit this recuerdo"));

        var updated = recuerdo with { Text = text.Trim() };
        await recuerdoRepository.UpdateAsync(updated);
        await recuerdoEmbeddingRepository.DeleteAsync(recuerdoId);

        var (nickname, avatarUrl, personaId) = await baulAccess.GetAuthorInfoAsync(updated.BaulId, updated.UserId, photoStorage);
        var photoThumbnailUrl = await GetPhotoThumbnailUrlAsync(updated.PhotoId);
        var chapterName = await GetChapterNameAsync(updated.ChapterId);

        logger.LogInformation("Recuerdo updated {BaulId} {RecuerdoId}", updated.BaulId, updated.Id);

        return ToDto(updated, nickname, avatarUrl, personaId, isOwn: true, photoThumbnailUrl, chapterName);
    }

    private async Task<string?> GetPhotoThumbnailUrlAsync(PhotoId? photoId)
    {
        if (photoId is null) return null;

        var photo = await photoRepository.GetByIdAsync(photoId.Value);
        return photo is null ? null : await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
    }

    private async Task<string?> GetChapterNameAsync(ChapterId? chapterId)
    {
        if (chapterId is null) return null;

        var chapter = await chapterRepository.GetByIdAsync(chapterId.Value);
        return chapter?.Name;
    }

    private static RecuerdoDto ToDto(
        Recuerdo recuerdo, string userName, string? userAvatar, string? personaId, bool isOwn,
        string? photoThumbnailUrl = null, string? chapterName = null) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId?.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn, photoThumbnailUrl, userAvatar, personaId, recuerdo.ChapterId?.ToString(), chapterName);
}
