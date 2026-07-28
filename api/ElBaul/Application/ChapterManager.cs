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
    public async Task<Result<IEnumerable<ChapterDto>>> GetByBaulIdAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Chapters by baul", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<ChapterDto>>(auth.Error);

        var chapters = await chapterRepository.GetByBaulIdAsync(baulId);
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

    public async Task<Result<ChapterDto>> CreateAsync(BaulId baulId, string name)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Chapter creation", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<ChapterDto>(auth.Error);

        var baul = auth.Value.Baul;
        var now = clock.UtcNow();
        var chapter = new Chapter(new ChapterId(idGenerator.NewId()), baulId, name, 0, null, now, now);
        await chapterRepository.CreateAsync(chapter);

        await baulRepository.UpdateAsync(baul with { ChapterCount = baul.ChapterCount + 1, UpdatedAt = now });

        logger.LogInformation("Chapter created {BaulId} {ChapterId} {Name}", baulId, chapter.Id, name);
        return ToDto(chapter, null, null, 0, null, null, EmptyDateRange);
    }

    public async Task<Result<ChapterDto>> SetCoverAsync(ChapterId chapterId, PhotoId photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null)
        {
            logger.LogWarning("Chapter cover update rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure<ChapterDto>(ApplicationError.NotFound("Chapter not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Chapter cover update", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<ChapterDto>(auth.Error);

        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null || photo.ChapterId != chapterId)
        {
            logger.LogWarning(
                "Chapter cover update rejected: photo not found {BaulId} {ChapterId} {PhotoId}",
                chapter.BaulId, chapterId, photoId);
            return Result.Failure<ChapterDto>(ApplicationError.NotFound("Photo not found"));
        }

        var updated = chapter.WithCover(photo, clock.UtcNow());
        await chapterRepository.UpdateAsync(updated);

        logger.LogInformation("Chapter cover updated {BaulId} {ChapterId} {PhotoId}", chapter.BaulId, chapterId, photoId);
        return await ToDtoAsync(updated);
    }

    public async Task<Result<ChapterDto>> UpdateAsync(ChapterId chapterId, string name)
    {
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null)
        {
            logger.LogWarning("Chapter update rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure<ChapterDto>(ApplicationError.NotFound("Chapter not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Chapter update", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<ChapterDto>(auth.Error);

        var updated = chapter with { Name = name, UpdatedAt = clock.UtcNow() };
        await chapterRepository.UpdateAsync(updated);

        logger.LogInformation("Chapter updated {BaulId} {ChapterId} {Name}", chapter.BaulId, chapterId, name);
        return await ToDtoAsync(updated);
    }

    public async Task<Result> DeleteAsync(ChapterId chapterId)
    {
        var userId = currentUserProvider.GetUserId();
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null)
        {
            logger.LogWarning("Chapter delete rejected: chapter not found {ChapterId}", chapterId);
            return Result.Failure(ApplicationError.NotFound("Chapter not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Admin, "Chapter delete", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure(auth.Error);
        var baul = auth.Value.Baul;

        var photos = await photoRepository.GetByChapterIdAsync(chapterId);
        foreach (var photo in photos)
            await photoRepository.UpdateAsync(photo with { ChapterId = null });

        var recuerdos = await recuerdoRepository.GetByChapterIdAsync(chapterId);
        foreach (var recuerdo in recuerdos)
            await recuerdoRepository.UpdateAsync(recuerdo with { ChapterId = null });

        await chapterRepository.DeleteAsync(chapterId);
        await baulRepository.UpdateAsync(baul with { ChapterCount = baul.ChapterCount - 1, UpdatedAt = clock.UtcNow() });

        logger.LogInformation("Chapter deleted {BaulId} {ChapterId}", chapter.BaulId, chapterId);
        return Result.Success();
    }

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
