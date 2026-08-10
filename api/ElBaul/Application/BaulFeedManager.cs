using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

// Merges IRecuerdoManager's recuerdo listing with IPhotoUploadBatchReadModel's photo-upload
// batches into one newest-first feed. Deliberately thin: it reuses RecuerdoManager's own
// GetRecuerdosAsync(BaulId) rather than duplicating its authorization/DTO-shaping logic, and
// authorizes its own photo-batch fetch independently — BaulAccessService.AuthorizeAsync is
// meant to be called liberally, not memoized across collaborators.
public class BaulFeedManager(
    ILogger<BaulFeedManager> logger,
    IRecuerdoManager recuerdoManager,
    IPhotoUploadBatchReadModel photoUploadBatchReadModel,
    IPhotoDtoProjector photoDtoProjector,
    AuthorInfoProjector authorInfoProjector,
    IAppConfiguration appConfiguration,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess) : IBaulFeedManager
{
    public async Task<Result<FeedPageDto>> GetFeedAsync(BaulId baulId, int skip, int take)
    {
        if (!appConfiguration.BaulFeedEnabled)
        {
            logger.LogWarning("Baul feed rejected: feed is not enabled {BaulId}", baulId);
            return Result.Failure<FeedPageDto>(ApplicationError.Validation("Baul feed is not enabled"));
        }

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Baul feed", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<FeedPageDto>(auth.Error);

        var recuerdos = await recuerdoManager.GetRecuerdosAsync(baulId);
        if (recuerdos.IsFailure) return Result.Failure<FeedPageDto>(recuerdos.Error);

        var batches = await BuildPhotoBatchDtosAsync(baulId);

        // Both sources are cheap in-process work (row counts a family archive never grows huge
        // — see IPhotoUploadBatchReadModel's own doc comment), so pagination happens after
        // merging+sorting rather than pushing skip/take into either read model's query. Same
        // take+1 trick as PhotoManager.GetPageAsync to detect more without a separate count.
        var items = recuerdos.Value.Select(FeedItemDto.ForRecuerdo)
            .Concat(batches.Select(FeedItemDto.ForPhotoBatch))
            .OrderByDescending(item => item.CreatedAt)
            .ToList();

        var clampedTake = Math.Clamp(take, 1, 50);
        var page = items.Skip(Math.Max(skip, 0)).Take(clampedTake + 1).ToList();
        var hasMore = page.Count > clampedTake;
        var pageItems = hasMore ? page.Take(clampedTake).ToList() : page;

        return Result.Success(new FeedPageDto(pageItems, hasMore));
    }

    public async Task<Result<IEnumerable<PhotoDto>>> GetBatchPhotosAsync(BaulId baulId, Guid batchId)
    {
        if (!appConfiguration.BaulFeedEnabled)
        {
            logger.LogWarning("Photo batch photos rejected: feed is not enabled {BaulId} {BatchId}", baulId, batchId);
            return Result.Failure<IEnumerable<PhotoDto>>(ApplicationError.Validation("Baul feed is not enabled"));
        }

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Photo batch photos", new { BaulId = baulId, BatchId = batchId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PhotoDto>>(auth.Error);

        var rows = await photoUploadBatchReadModel.GetPhotosByBatchIdAsync(baulId, batchId);
        if (rows.Count == 0)
        {
            logger.LogWarning("Photo batch photos rejected: batch not found {BaulId} {BatchId}", baulId, batchId);
            return Result.Failure<IEnumerable<PhotoDto>>(ApplicationError.NotFound("Photo batch not found"));
        }

        var dtos = await photoDtoProjector.ProjectAsync(rows);
        return Result.Success<IEnumerable<PhotoDto>>(dtos);
    }

    private async Task<List<PhotoBatchDto>> BuildPhotoBatchDtosAsync(BaulId baulId)
    {
        var rows = await photoUploadBatchReadModel.GetByBaulIdAsync(baulId);
        if (rows.Count == 0) return [];

        var authorsByUserId = await authorInfoProjector.GetManyAsync(baulId, rows.Select(r => r.UploadedBy).Distinct());

        var dtos = new List<PhotoBatchDto>();
        foreach (var row in rows)
        {
            var (nickname, avatarUrl, personaId) = AuthorInfoProjector.Resolve(authorsByUserId, row.UploadedBy);
            var previewDtos = await photoDtoProjector.ProjectAsync(row.PreviewPhotos);
            dtos.Add(new PhotoBatchDto(
                row.BatchId.ToString(), row.UploadedBy, nickname, avatarUrl, personaId, row.PhotoCount,
                row.ChapterId?.ToString(), row.ChapterName, row.CreatedAt, previewDtos));
        }

        return dtos;
    }
}
