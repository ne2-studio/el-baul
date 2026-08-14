using ElBaul.Application.Bauls;
using ElBaul.Application.Personas;
using ElBaul.Application.Photos;
using ElBaul.InputPorts.Feed;
using ElBaul.InputPorts.Photos;
using ElBaul.InputPorts.Recuerdos;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Feed;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Feed;
// Merges IRecuerdoManager's recuerdo listing, IPhotoUploadBatchReadModel's photo-upload
// batches and IChapterRepository's chapters into one newest-first feed. Deliberately thin: it
// reuses RecuerdoManager's own GetRecuerdosAsync(BaulId) rather than duplicating its
// authorization/DTO-shaping logic. A batch's own photos are fetched separately, via
// IPhotoManager.GetBatchPhotosAsync.
public class BaulFeedManager(
    ILogger<BaulFeedManager> logger,
    IRecuerdoManager recuerdoManager,
    IPhotoUploadBatchReadModel photoUploadBatchReadModel,
    IPhotoDtoProjector photoDtoProjector,
    AuthorInfoProjector authorInfoProjector,
    IChapterRepository chapterRepository,
    IPhotoStorage photoStorage,
    IBaulFeedCursorRepository feedCursorRepository,
    IAppConfiguration appConfiguration,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IClock clock) : IBaulFeedManager
{
    public async Task<Result<FeedPageDto>> GetFeedAsync(BaulId baulId, int skip, int take)
    {
        if (!appConfiguration.BaulFeedEnabled)
        {
            logger.LogWarning("Baul feed rejected: feed is not enabled");
            return Result.Failure<FeedPageDto>(ApplicationError.Validation("Baul feed is not enabled"));
        }

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Baul feed");
        if (auth.IsFailure) return Result.Failure<FeedPageDto>(auth.Error);

        var recuerdos = await recuerdoManager.GetRecuerdosAsync(baulId);
        if (recuerdos.IsFailure) return Result.Failure<FeedPageDto>(recuerdos.Error);

        var batches = await BuildPhotoBatchDtosAsync(baulId, auth.Value.IsAdmin, userId);
        var chapterItems = await BuildChapterCreatedItemsAsync(baulId);

        // Both sources are cheap in-process work (row counts a family archive never grows huge
        // — see IPhotoUploadBatchReadModel's own doc comment), so pagination happens after
        // merging+sorting rather than pushing skip/take into either read model's query. Same
        // take+1 trick as PhotoManager.GetPageAsync to detect more without a separate count.
        var items = recuerdos.Value.Select(FeedItemDto.ForRecuerdo)
            .Concat(batches.Select(FeedItemDto.ForPhotoBatch))
            .Concat(chapterItems)
            .OrderByDescending(item => item.CreatedAt)
            .ToList();

        var clampedTake = Math.Clamp(take, 1, 50);

        // skip == 0 means "the caller just opened this baúl's feed" — see IBaulFeedManager's doc
        // comment. requestedAt is captured up front (not after building the page) so the cursor
        // never advances past activity that arrived while this very request was in flight.
        var requestedAt = clock.UtcNow();
        DateTime? cursor = null;
        if (skip == 0)
        {
            cursor = await feedCursorRepository.GetAsync(userId, baulId);
            var effectiveCursor = cursor ?? requestedAt;
            var newCount = items.Count(item => item.CreatedAt > effectiveCursor);
            // Widen, never shrink — a visit with more new activity than `take` must still see
            // all of it on the first page, not have it cut off by pagination.
            clampedTake = Math.Max(clampedTake, newCount);
        }

        var page = items.Skip(Math.Max(skip, 0)).Take(clampedTake + 1).ToList();
        var hasMore = page.Count > clampedTake;
        var pageItems = hasMore ? page.Take(clampedTake).ToList() : page;

        if (skip == 0)
        {
            var effectiveCursor = cursor ?? requestedAt;
            pageItems = pageItems
                .Select(item => item.CreatedAt > effectiveCursor ? item with { IsNew = true } : item)
                .ToList();
            await feedCursorRepository.UpsertAsync(userId, baulId, requestedAt);
        }

        return Result.Success(new FeedPageDto(pageItems, hasMore));
    }

    private async Task<List<PhotoBatchDto>> BuildPhotoBatchDtosAsync(BaulId baulId, bool isAdmin, UserId currentUserId)
    {
        var rows = await photoUploadBatchReadModel.GetByBaulIdAsync(baulId);
        if (rows.Count == 0) return [];

        var authorsByUserId = await authorInfoProjector.GetManyAsync(baulId, rows.Select(r => r.UploadedBy).Distinct());

        var dtos = new List<PhotoBatchDto>();
        foreach (var row in rows)
        {
            var (nickname, avatarUrl, personaId) = AuthorInfoProjector.Resolve(authorsByUserId, row.UploadedBy);
            var previewDtos = await photoDtoProjector.ProjectAsync(row.PreviewPhotos, isAdmin, currentUserId);
            dtos.Add(new PhotoBatchDto(
                row.BatchId.ToString(), row.UploadedBy, nickname, avatarUrl, personaId, row.PhotoCount,
                row.ChapterId?.ToString(), row.ChapterName, row.CreatedAt, previewDtos));
        }

        return dtos;
    }

    private async Task<List<FeedItemDto>> BuildChapterCreatedItemsAsync(BaulId baulId)
    {
        var chapters = (await chapterRepository.GetByBaulIdAsync(baulId)).ToList();
        if (chapters.Count == 0) return [];

        var authorsByUserId = await authorInfoProjector.GetManyAsync(
            baulId, chapters.Select(c => new UserId(c.CreatedByUserId)).Distinct());

        var items = new List<FeedItemDto>();
        foreach (var chapter in chapters)
        {
            var (nickname, avatarUrl, personaId) = AuthorInfoProjector.Resolve(authorsByUserId, new UserId(chapter.CreatedByUserId));
            var coverCrop = new ImageCrop(chapter.CoverCropX, chapter.CoverCropY, chapter.CoverCropScale);
            var coverUrl = await CoverUrlResolver.ResolveAsync(chapter.CoverPhotoKey, ImagePlacement.ChapterCover, photoStorage, coverCrop);
            var dto = new ChapterCreatedFeedDto(
                chapter.Id.ToString(), chapter.Name, coverUrl, chapter.CreatedAt,
                chapter.CreatedByUserId, nickname, avatarUrl, personaId);
            items.Add(FeedItemDto.ForChapterCreated(dto));
        }

        return items;
    }
}
