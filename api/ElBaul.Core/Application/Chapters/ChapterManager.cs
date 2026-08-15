using ElBaul.Application.Bauls;
using ElBaul.Application.Personas;
using ElBaul.InputPorts.Chapters;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Chapters;
public class ChapterManager(
    ILogger<ChapterManager> logger,
    IChapterRepository chapterRepository,
    IChapterListReadModel chapterListReadModel,
    IBaulRepository baulRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    AuthorInfoProjector authorInfoProjector,
    IUnitOfWork unitOfWork) : IChapterManager
{
    public async Task<Result<IEnumerable<ChapterDto>>> GetByBaulIdAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Chapters by baul");
        if (auth.IsFailure) return Result.Failure<IEnumerable<ChapterDto>>(auth.Error);

        // IChapterListReadModel does the heavy lifting (recuerdo counts/latest, photo date
        // ranges) in a handful of baúl-scoped queries instead of one round trip per chapter;
        // the only thing still fetched per row here is a batched author lookup and, per row,
        // a (non-DB) signed-URL computation.
        var rows = await chapterListReadModel.GetByBaulIdAsync(baulId);

        var authorUserIds = rows
            .Where(r => r.LatestRecuerdoAuthorUserId is not null)
            .Select(r => r.LatestRecuerdoAuthorUserId!.Value)
            .Distinct();
        var authors = await authorInfoProjector.GetManyAsync(baulId, authorUserIds);

        var dtos = new List<ChapterDto>();
        foreach (var row in rows)
            dtos.Add(await ToDtoAsync(row, authors));

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

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Chapter creation");
        if (auth.IsFailure) return Result.Failure<ChapterDto>(auth.Error);

        var baul = auth.Value.Baul;
        var now = clock.UtcNow();
        var chapter = new Chapter(new ChapterId(idGenerator.NewId()), baulId, name, 0, null, now, now, userId);

        // Both writes commit together — a chapter that isn't reflected in its baúl's
        // ChapterCount is an inconsistency the frontend has no way to reconcile.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await chapterRepository.CreateAsync(chapter);
            await baulRepository.UpdateAsync(baul.WithChapterAdded(now));
            return Result.Success();
        });

        logger.LogInformation("Chapter created {ChapterId} {Name}", chapter.Id, name);
        return ToDto(chapter, null, null, 0, null, null, ChapterDateRange.Empty);
    }

    public async Task<Result<ChapterDto>> SetCoverAsync(ChapterId chapterId, PhotoId photoId, PhotoCrop crop)
    {
        var userId = currentUserProvider.GetUserId();
        var chapterResult = await EntityLookup.ResolveAsync(
            () => chapterRepository.GetByIdAsync(chapterId),
            logger,
            "Chapter cover update rejected: chapter not found {ChapterId}",
            "Chapter not found",
            chapterId);
        if (chapterResult.IsFailure) return Result.Failure<ChapterDto>(chapterResult.Error);
        var chapter = chapterResult.Value;

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Chapter cover update", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<ChapterDto>(auth.Error);

        var photoResult = await EntityLookup.ResolveAsync(
            () => photoRepository.GetByIdAsync(photoId),
            photo => photo.ChapterId == chapterId,
            logger,
            "Chapter cover update rejected: photo not found {PhotoId}",
            "Photo not found",
            photoId);
        if (photoResult.IsFailure) return Result.Failure<ChapterDto>(photoResult.Error);
        var photo = photoResult.Value;

        var updated = chapter.WithCover(photo, crop.X, crop.Y, crop.Scale, clock.UtcNow());
        await chapterRepository.UpdateAsync(updated);

        logger.LogInformation("Chapter cover updated {PhotoId}", photoId);
        return await ToDtoAsync(updated);
    }

    public async Task<Result<ChapterDto>> UpdateAsync(ChapterId chapterId, string name)
    {
        var userId = currentUserProvider.GetUserId();
        var chapterResult = await EntityLookup.ResolveAsync(
            () => chapterRepository.GetByIdAsync(chapterId),
            logger,
            "Chapter update rejected: chapter not found {ChapterId}",
            "Chapter not found",
            chapterId);
        if (chapterResult.IsFailure) return Result.Failure<ChapterDto>(chapterResult.Error);
        var chapter = chapterResult.Value;

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Member, "Chapter update", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure<ChapterDto>(auth.Error);

        var updated = chapter.WithName(name, clock.UtcNow());
        await chapterRepository.UpdateAsync(updated);

        logger.LogInformation("Chapter updated {Name}", name);
        return await ToDtoAsync(updated);
    }

    public async Task<Result> DeleteAsync(ChapterId chapterId)
    {
        var userId = currentUserProvider.GetUserId();
        var chapterResult = await EntityLookup.ResolveAsync(
            () => chapterRepository.GetByIdAsync(chapterId),
            logger,
            "Chapter delete rejected: chapter not found {ChapterId}",
            "Chapter not found",
            chapterId);
        if (chapterResult.IsFailure) return Result.Failure(chapterResult.Error);
        var chapter = chapterResult.Value;

        var auth = await baulAccess.AuthorizeAsync(
            chapter.BaulId, userId, AccessLevel.Admin, "Chapter delete", new { chapter.BaulId, ChapterId = chapterId });
        if (auth.IsFailure) return Result.Failure(auth.Error);
        var baul = auth.Value.Baul;

        // All photos, not just active ones: Photo.ChapterId is a Cascade FK, so a soft-deleted
        // photo left pointing at the chapter would be cascade-deleted by Postgres itself and
        // then blocked by the Restrict FK from PhotoPersonaTags (see GetAllByChapterIdAsync).
        var photos = await photoRepository.GetAllByChapterIdAsync(chapterId);
        var recuerdos = await recuerdoRepository.GetByChapterIdAsync(chapterId);

        // Orphaning photos/recuerdos, deleting the chapter (ExecuteDeleteAsync — bypasses the
        // change tracker, see IUnitOfWork's doc comment) and decrementing the baúl's
        // ChapterCount commit together — a failure partway used to leave photos/recuerdos
        // pointing at a chapter that either still exists half-updated or is already gone.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            foreach (var photo in photos)
                await photoRepository.UpdateAsync(photo.WithoutChapter());

            foreach (var recuerdo in recuerdos)
                await recuerdoRepository.UpdateAsync(recuerdo.WithoutChapter());

            await chapterRepository.DeleteAsync(chapterId);
            await baulRepository.UpdateAsync(baul.WithChapterRemoved(clock.UtcNow()));
            return Result.Success();
        });

        logger.LogInformation("Chapter deleted");
        return Result.Success();
    }

    // Single-chapter path — Create/Update/SetCover/Delete each return the one chapter they just
    // touched, so a per-chapter photos/recuerdos/author lookup here is fine (there's no list to
    // fan out over). GetByBaulIdAsync uses IChapterListReadModel + ToDtoAsync(ChapterListRow, ...)
    // below instead, precisely to avoid running this once per chapter in a baúl.
    private async Task<ChapterDto> ToDtoAsync(Chapter chapter)
    {
        var crop = new ImageCrop(chapter.CoverCropX, chapter.CoverCropY, chapter.CoverCropScale);
        var coverUrl = await CoverUrlResolver.ResolveAsync(chapter.CoverPhotoKey, ImagePlacement.ChapterCover, photoStorage, crop);
        var featuredCoverUrl = await CoverUrlResolver.ResolveAsync(chapter.CoverPhotoKey, ImagePlacement.ChapterCoverFeatured, photoStorage, crop);

        var photos = (await photoRepository.GetByChapterIdAsync(chapter.Id)).ToList();
        var recuerdos = (await recuerdoRepository.GetByChapterIdAsync(chapter.Id)).ToList();
        var latestRecuerdo = recuerdos.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
        var latestAuthor = latestRecuerdo is null
            ? null
            : (await authorInfoProjector.GetAsync(chapter.BaulId, latestRecuerdo.UserId)).Nickname;

        var dateRange = ChapterDateRangeCalculator.Compute(photos);

        return ToDto(chapter, coverUrl, featuredCoverUrl, recuerdos.Count, latestRecuerdo?.Text, latestAuthor, dateRange);
    }

    // List path — turns an already-batched IChapterListReadModel row plus an already-batched
    // author map (see GetByBaulIdAsync) into a ChapterDto. The only per-row work left is
    // resolving cover/featured-cover URLs, which IPhotoStorage computes locally (no DB/network
    // round trip — see MinioPhotoStorage.GetImageUrl), so it stays cheap per chapter.
    private async Task<ChapterDto> ToDtoAsync(ChapterListRow row, IReadOnlyDictionary<UserId, AuthorInfo> authorsByUserId)
    {
        var crop = new ImageCrop(row.CoverCropX, row.CoverCropY, row.CoverCropScale);
        var coverUrl = await CoverUrlResolver.ResolveAsync(row.CoverPhotoKey, ImagePlacement.ChapterCover, photoStorage, crop);
        var featuredCoverUrl = await CoverUrlResolver.ResolveAsync(row.CoverPhotoKey, ImagePlacement.ChapterCoverFeatured, photoStorage, crop);

        var latestAuthor = row.LatestRecuerdoAuthorUserId is { } userId
            ? AuthorInfoProjector.Resolve(authorsByUserId, userId).Nickname
            : null;

        return new ChapterDto(
            row.Id.ToString(), row.BaulId.ToString(), row.Name, row.PhotoCount, coverUrl, featuredCoverUrl,
            row.CreatedAt, row.UpdatedAt, row.RecuerdoCount, row.LatestRecuerdoText, latestAuthor,
            row.DateRange.MinYear, row.DateRange.MinMonth, row.DateRange.MinDay,
            row.DateRange.MaxYear, row.DateRange.MaxMonth, row.DateRange.MaxDay, row.DateRange.UndatedPhotoCount,
            row.CoverCropX, row.CoverCropY, row.CoverCropScale);
    }

    private static ChapterDto ToDto(
        Chapter chapter, string? coverUrl, string? featuredCoverUrl, int recuerdoCount,
        string? latestRecuerdoText, string? latestRecuerdoAuthor, ChapterDateRange dateRange) =>
        new(chapter.Id.ToString(), chapter.BaulId.ToString(), chapter.Name,
            chapter.PhotoCount, coverUrl, featuredCoverUrl, chapter.CreatedAt, chapter.UpdatedAt,
            recuerdoCount, latestRecuerdoText, latestRecuerdoAuthor,
            dateRange.MinYear, dateRange.MinMonth, dateRange.MinDay, dateRange.MaxYear, dateRange.MaxMonth, dateRange.MaxDay, dateRange.UndatedPhotoCount,
            chapter.CoverCropX, chapter.CoverCropY, chapter.CoverCropScale);
}
