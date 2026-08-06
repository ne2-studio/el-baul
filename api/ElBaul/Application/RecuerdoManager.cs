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
    BaulAccessService baulAccess,
    AuthorInfoProjector authorInfoProjector) : IRecuerdoManager
{
    // The one internal shape every scoped entry point resolves down to before the shared
    // create/query logic runs — BaulId is always known, ChapterId/PhotoId follow the Photo >
    // Chapter > Baul precedence already implicit in Recuerdo's constructors (a photo-scoped
    // recuerdo inherits its photo's chapter; a chapter-scoped one has no photo; a baúl-scoped
    // one has neither). ChapterName is only ever populated when the scope itself is a chapter
    // (a resolved-from-photo ChapterId does not carry a name — see ResolveScopeAsync(PhotoId)).
    private readonly record struct RecuerdoScope(BaulId BaulId, ChapterId? ChapterId, PhotoId? PhotoId, string? ChapterName);

    private enum ChapterNameMode { None, Constant, PerChapter }

    public Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(BaulId baulId) =>
        GetRecuerdosCoreAsync(
            new RecuerdoScope(baulId, null, null, null), "Baul recuerdos", new { BaulId = baulId },
            includeThumbnails: true, ChapterNameMode.PerChapter);

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(ChapterId chapterId)
    {
        var scope = await ResolveScopeAsync(chapterId, "Chapter recuerdos");
        if (scope.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(scope.Error);

        return await GetRecuerdosCoreAsync(
            scope.Value, "Chapter recuerdos", new { scope.Value.BaulId, ChapterId = chapterId },
            includeThumbnails: true, ChapterNameMode.Constant);
    }

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(PhotoId photoId)
    {
        var scope = await ResolveScopeAsync(photoId, "Photo recuerdos");
        if (scope.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(scope.Error);

        return await GetRecuerdosCoreAsync(
            scope.Value, "Photo recuerdos", new { scope.Value.BaulId, PhotoId = photoId },
            includeThumbnails: false, ChapterNameMode.None);
    }

    public Task<Result<RecuerdoDto>> CreateRecuerdoAsync(BaulId baulId, string text) =>
        CreateRecuerdoCoreAsync(new RecuerdoScope(baulId, null, null, null), text, "Recuerdo creation", new { BaulId = baulId });

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(ChapterId chapterId, string text)
    {
        var scope = await ResolveScopeAsync(chapterId, "Recuerdo creation");
        if (scope.IsFailure) return Result.Failure<RecuerdoDto>(scope.Error);

        return await CreateRecuerdoCoreAsync(scope.Value, text, "Recuerdo creation", new { scope.Value.BaulId, ChapterId = chapterId });
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(PhotoId photoId, string text)
    {
        var scope = await ResolveScopeAsync(photoId, "Recuerdo creation");
        if (scope.IsFailure) return Result.Failure<RecuerdoDto>(scope.Error);

        return await CreateRecuerdoCoreAsync(scope.Value, text, "Recuerdo creation", new { scope.Value.BaulId, PhotoId = photoId });
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

        var (nickname, avatarUrl, personaId) = await authorInfoProjector.GetAsync(updated.BaulId, updated.UserId);
        var photoThumbnailUrl = await GetPhotoThumbnailUrlAsync(updated.PhotoId);
        var chapterName = await GetChapterNameAsync(updated.ChapterId);

        logger.LogInformation("Recuerdo updated {BaulId} {RecuerdoId}", updated.BaulId, updated.Id);

        return ToDto(updated, nickname, avatarUrl, personaId, isOwn: true, photoThumbnailUrl, chapterName);
    }

    // --- Scope resolution ---------------------------------------------------------------
    //
    // A BaulId is already the scope, nothing to resolve. A ChapterId/PhotoId must first be
    // turned into the BaulId (and, for photos, the inherited ChapterId) it lives under —
    // this is the only part of the three public entry points that genuinely varies by scope,
    // so it stays a per-scope lookup with its own not-found message, logged uniformly against
    // whichever operation asked for it.

    private async Task<Result<RecuerdoScope>> ResolveScopeAsync(ChapterId chapterId, string operationName)
    {
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null)
        {
            logger.LogWarning("{Operation} rejected: chapter not found {ChapterId}", operationName, chapterId);
            return Result.Failure<RecuerdoScope>(ApplicationError.NotFound("Chapter not found"));
        }

        return Result.Success(new RecuerdoScope(chapter.BaulId, chapterId, null, chapter.Name));
    }

    private async Task<Result<RecuerdoScope>> ResolveScopeAsync(PhotoId photoId, string operationName)
    {
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("{Operation} rejected: photo not found {PhotoId}", operationName, photoId);
            return Result.Failure<RecuerdoScope>(ApplicationError.NotFound("Photo not found"));
        }

        // A photo-scoped recuerdo carries its photo's chapter (if any) for storage/precedence
        // purposes, but — matching the existing photo-scoped contract — never surfaces a
        // ChapterName: the caller is already on that photo's page and doesn't need it restated.
        return Result.Success(new RecuerdoScope(photo.BaulId, photo.ChapterId, photoId, null));
    }

    // --- Shared query/create logic ------------------------------------------------------
    //
    // Everything below runs exactly once regardless of which public entry point got here:
    // authorization, author-info resolution, DTO shaping, and what gets logged are all a
    // single rule now instead of three near-identical copies.

    private async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosCoreAsync(
        RecuerdoScope scope, string operationName, object authContext, bool includeThumbnails, ChapterNameMode chapterNameMode)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(scope.BaulId, userId, AccessLevel.Member, operationName, authContext);
        if (auth.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(auth.Error);

        var recuerdos = (await FetchRecuerdosAsync(scope)).ToList();

        var thumbnailUrls = includeThumbnails ? await BuildThumbnailUrlsAsync(recuerdos) : null;
        var chapterNames = chapterNameMode == ChapterNameMode.PerChapter
            ? (await chapterRepository.GetByBaulIdAsync(scope.BaulId)).ToDictionary(c => c.Id, c => c.Name)
            : null;

        // One batched author lookup for the whole list instead of one per recuerdo — a feed
        // is typically a handful of distinct authors across many entries.
        var authorsByUserId = await authorInfoProjector.GetManyAsync(scope.BaulId, recuerdos.Select(r => r.UserId).Distinct());

        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var (nickname, avatarUrl, personaId) = AuthorInfoProjector.Resolve(authorsByUserId, recuerdo.UserId);
            var thumbnailUrl = thumbnailUrls is not null && recuerdo.PhotoId is { } photoId
                ? thumbnailUrls.GetValueOrDefault(photoId)
                : null;
            var chapterName = chapterNameMode switch
            {
                ChapterNameMode.Constant => scope.ChapterName,
                ChapterNameMode.PerChapter when recuerdo.ChapterId is { } chapterId => chapterNames!.GetValueOrDefault(chapterId),
                _ => null
            };
            dtos.Add(ToDto(recuerdo, nickname, avatarUrl, personaId, recuerdo.UserId == userId, thumbnailUrl, chapterName));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    private async Task<Result<RecuerdoDto>> CreateRecuerdoCoreAsync(RecuerdoScope scope, string text, string operationName, object authContext)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(scope.BaulId, userId, AccessLevel.Member, operationName, authContext);
        if (auth.IsFailure) return Result.Failure<RecuerdoDto>(auth.Error);

        var (nickname, avatarUrl, personaId) = await authorInfoProjector.GetAsync(scope.BaulId, userId);
        var recuerdo = new Recuerdo(new RecuerdoId(idGenerator.NewId()), scope.PhotoId, scope.ChapterId, scope.BaulId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation(
            "Recuerdo created {BaulId} {ChapterId} {PhotoId} {RecuerdoId}", scope.BaulId, scope.ChapterId, scope.PhotoId, recuerdo.Id);

        return ToDto(recuerdo, nickname, avatarUrl, personaId, isOwn: true, photoThumbnailUrl: null, chapterName: scope.ChapterName);
    }

    private Task<IEnumerable<Recuerdo>> FetchRecuerdosAsync(RecuerdoScope scope) =>
        scope.PhotoId is { } photoId ? recuerdoRepository.GetByPhotoIdAsync(photoId)
        : scope.ChapterId is { } chapterId ? recuerdoRepository.GetByChapterIdAsync(chapterId)
        : recuerdoRepository.GetByBaulIdAsync(scope.BaulId);

    private async Task<Dictionary<PhotoId, string>> BuildThumbnailUrlsAsync(IEnumerable<Recuerdo> recuerdos)
    {
        var photoIds = recuerdos.Where(r => r.PhotoId is not null).Select(r => r.PhotoId!.Value).Distinct().ToList();
        if (photoIds.Count == 0) return [];

        // One IPhotoRepository.GetByIdsAsync call for every distinct photo in the list instead
        // of one GetByIdAsync round trip each.
        var photos = await photoRepository.GetByIdsAsync(photoIds);
        var thumbnailUrls = new Dictionary<PhotoId, string>();
        foreach (var photo in photos)
            thumbnailUrls[photo.Id] = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);

        return thumbnailUrls;
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
