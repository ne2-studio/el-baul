using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

using DateRange = (int? MinY, int? MinM, int? MinD, int? MaxY, int? MaxM, int? MaxD, int Undated);

public class ChapterManager(
    ILogger<ChapterManager> logger,
    IChapterRepository chapterRepository,
    IBaulRepository baulRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess) : IChapterManager
{
    public async Task<Result<IEnumerable<ChapterDto>>> GetByBaulIdAsync(Guid baulId)
    {
        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(id, userId, AccessLevel.Member, "Chapters by baul", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<ChapterDto>>(auth.Error);

        var chapters = await chapterRepository.GetByBaulIdAsync(id);
        var dtos = new List<ChapterDto>();
        foreach (var chapter in chapters)
            dtos.Add(await ToDtoAsync(chapter));

        // Chronological: dated chapters first (oldest min date first, so the baúl reads like a
        // story), undated-only chapters last.
        var sorted = dtos
            .OrderByDescending(d => d.MinDateYear.HasValue)
            .ThenBy(d => d.MinDateYear ?? int.MinValue)
            .ThenBy(d => d.MinDateMonth ?? 1)
            .ThenBy(d => d.MinDateDay ?? 1)
            .ThenBy(d => d.UpdatedAt)
            .ToList();

        return Result.Success<IEnumerable<ChapterDto>>(sorted);
    }

    public async Task<Result<ChapterDto>> CreateAsync(Guid baulId, string name)
    {
        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(id, userId, AccessLevel.Member, "Chapter creation", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<ChapterDto>(auth.Error);

        var baul = auth.Value.Baul;
        var now = clock.UtcNow();
        var chapter = new Chapter(new ChapterId(idGenerator.NewId()), id, name, 0, null, now, now);
        await chapterRepository.CreateAsync(chapter);

        await baulRepository.UpdateAsync(baul with { ChapterCount = baul.ChapterCount + 1, UpdatedAt = now });

        logger.LogInformation("Chapter created {BaulId} {ChapterId} {Name}", baulId, chapter.Id, name);
        return ToDto(chapter, null, null, 0, null, null, EmptyDateRange);
    }

    public async Task<Result<ChapterDto>> SetCoverAsync(Guid chapterId, Guid photoId)
    {
        var id = new ChapterId(chapterId);
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(id);
        if (chapter is null)
        {
            logger.LogWarning("Chapter cover update rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure<ChapterDto>("Chapter not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Chapter cover update", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<ChapterDto>(auth.Error);

        var photo = await photoRepository.GetByIdAsync(new PhotoId(photoId));
        if (photo is null || photo.ChapterId != id)
        {
            logger.LogWarning(
                "Chapter cover update rejected: photo not found {BaulId} {ChapterId} {PhotoId}",
                chapter.BaulId, chapterId, photoId);
            return Result.Failure<ChapterDto>("Photo not found");
        }

        var updated = chapter with { CoverPhotoKey = photo.StorageKey, UpdatedAt = clock.UtcNow() };
        await chapterRepository.UpdateAsync(updated);

        logger.LogInformation("Chapter cover updated {BaulId} {ChapterId} {PhotoId}", chapter.BaulId, chapterId, photoId);
        return await ToDtoAsync(updated);
    }

    public async Task<Result<ChapterDto>> UpdateAsync(Guid chapterId, string name)
    {
        var id = new ChapterId(chapterId);
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(id);
        if (chapter is null)
        {
            logger.LogWarning("Chapter update rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure<ChapterDto>("Chapter not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Chapter update", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<ChapterDto>(auth.Error);

        var updated = chapter with { Name = name, UpdatedAt = clock.UtcNow() };
        await chapterRepository.UpdateAsync(updated);

        logger.LogInformation("Chapter updated {BaulId} {ChapterId} {Name}", chapter.BaulId, chapterId, name);
        return await ToDtoAsync(updated);
    }

    public async Task<Result> DeleteAsync(Guid chapterId)
    {
        var id = new ChapterId(chapterId);
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(id);
        if (chapter is null)
        {
            logger.LogWarning("Chapter delete rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure("Chapter not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Admin, "Chapter delete", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure(auth.Error);
        var baul = auth.Value.Baul;

        var photos = await photoRepository.GetByChapterIdAsync(id);
        foreach (var photo in photos)
            await photoRepository.UpdateAsync(photo with { ChapterId = null });

        var recuerdos = await recuerdoRepository.GetByChapterIdAsync(id);
        foreach (var recuerdo in recuerdos)
            await recuerdoRepository.UpdateAsync(recuerdo with { ChapterId = null });

        await chapterRepository.DeleteAsync(id);
        await baulRepository.UpdateAsync(baul with { ChapterCount = baul.ChapterCount - 1, UpdatedAt = clock.UtcNow() });

        logger.LogInformation("Chapter deleted {BaulId} {ChapterId}", chapter.BaulId, chapterId);
        return Result.Success();
    }

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid chapterId)
    {
        var id = new ChapterId(chapterId);
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(id);
        if (chapter is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Chapter not found");

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Chapter recuerdos", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(auth.Error);

        var recuerdos = (await recuerdoRepository.GetByChapterIdAsync(id)).ToList();

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
            dtos.Add(ToRecuerdoDto(recuerdo, nickname, avatarUrl, personaId, recuerdo.UserId == userId, thumbnailUrl, chapter.Name));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid chapterId, string text)
    {
        var id = new ChapterId(chapterId);
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(id);
        if (chapter is null)
        {
            logger.LogWarning("Recuerdo creation rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure<RecuerdoDto>("Chapter not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Recuerdo creation", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<RecuerdoDto>(auth.Error);

        var (nickname, avatarUrl, personaId) = await baulAccess.GetAuthorInfoAsync(chapter.BaulId, userId, photoStorage);
        var recuerdo = new Recuerdo(new RecuerdoId(idGenerator.NewId()), null, id, chapter.BaulId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation("Recuerdo created {BaulId} {ChapterId} {RecuerdoId}", chapter.BaulId, chapterId, recuerdo.Id);

        return ToRecuerdoDto(recuerdo, nickname, avatarUrl, personaId, isOwn: true, photoThumbnailUrl: null, chapterName: chapter.Name);
    }

    private static RecuerdoDto ToRecuerdoDto(
        Recuerdo recuerdo, string userName, string? userAvatar, string? personaId, bool isOwn, string? photoThumbnailUrl,
        string? chapterName = null) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId?.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn, photoThumbnailUrl, userAvatar, personaId, recuerdo.ChapterId?.ToString(), chapterName);

    private async Task<ChapterDto> ToDtoAsync(Chapter chapter)
    {
        var coverUrl = chapter.CoverPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(chapter.CoverPhotoKey, ImagePlacement.ChapterCover)
            : null;
        var featuredCoverUrl = chapter.CoverPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(chapter.CoverPhotoKey, ImagePlacement.ChapterCoverFeatured)
            : null;

        var photos = (await photoRepository.GetByChapterIdAsync(chapter.Id)).ToList();
        var recuerdos = (await recuerdoRepository.GetByChapterIdAsync(chapter.Id)).ToList();
        var latestRecuerdo = recuerdos.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
        var latestAuthor = latestRecuerdo is null
            ? null
            : (await baulAccess.GetAuthorInfoAsync(chapter.BaulId, latestRecuerdo.UserId, photoStorage)).Nickname;

        var dateRange = ComputeDateRange(photos);

        return ToDto(chapter, coverUrl, featuredCoverUrl, recuerdos.Count, latestRecuerdo?.Text, latestAuthor, dateRange);
    }

    private static readonly DateRange EmptyDateRange = (null, null, null, null, null, null, 0);

    private static DateRange ComputeDateRange(IReadOnlyCollection<Photo> photos)
    {
        var dated = photos.Where(p => p.Date is not null).ToList();
        var undatedCount = photos.Count - dated.Count;
        if (dated.Count == 0) return (null, null, null, null, null, null, undatedCount);

        var min = dated.OrderBy(p => p.Date!.Year).ThenBy(p => p.Date!.Month ?? 1).ThenBy(p => p.Date!.Day ?? 1).First();
        var max = dated.OrderByDescending(p => p.Date!.Year).ThenByDescending(p => p.Date!.Month ?? 1).ThenByDescending(p => p.Date!.Day ?? 1).First();

        return (min.Date!.Year, min.Date!.Month, min.Date!.Day,
            max.Date!.Year, max.Date!.Month, max.Date!.Day, undatedCount);
    }

    private static ChapterDto ToDto(
        Chapter chapter, string? coverUrl, string? featuredCoverUrl, int recuerdoCount,
        string? latestRecuerdoText, string? latestRecuerdoAuthor, DateRange dateRange) =>
        new(chapter.Id.ToString(), chapter.BaulId.ToString(), chapter.Name,
            chapter.PhotoCount, coverUrl, featuredCoverUrl, chapter.CreatedAt, chapter.UpdatedAt,
            recuerdoCount, latestRecuerdoText, latestRecuerdoAuthor,
            dateRange.MinY, dateRange.MinM, dateRange.MinD, dateRange.MaxY, dateRange.MaxM, dateRange.MaxD, dateRange.Undated);
}
