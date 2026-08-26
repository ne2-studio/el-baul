using ElBaul.Core.Chapters.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Bauls;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Core.Recuerdos.Application;
public class RecuerdoManager(
    ILogger<RecuerdoManager> logger,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IRecuerdoListReadModel recuerdoListReadModel,
    IRecuerdoEmbeddingRepository recuerdoEmbeddingRepository,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IPhotoStorage photoStorage,
    IBaulAuthorizer baulAccess,
    AuthorInfoProjector authorInfoProjector,
    IUnitOfWork unitOfWork) : IRecuerdoManager
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
            new RecuerdoScope(baulId, null, null, null), "Baul recuerdos",
            includeThumbnails: true, chapterNameMode: ChapterNameMode.PerChapter);

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(ChapterId chapterId)
    {
        var scope = await ResolveScopeAsync(chapterId, "Chapter recuerdos");
        if (scope.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(scope.Error);

        return await GetRecuerdosCoreAsync(
            scope.Value, "Chapter recuerdos", includeThumbnails: true, chapterNameMode: ChapterNameMode.Constant,
            new { scope.Value.BaulId, ChapterId = chapterId });
    }

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(PhotoId photoId)
    {
        var scope = await ResolveScopeAsync(photoId, "Photo recuerdos");
        if (scope.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(scope.Error);

        return await GetRecuerdosCoreAsync(
            scope.Value, "Photo recuerdos", includeThumbnails: false, chapterNameMode: ChapterNameMode.None,
            new { scope.Value.BaulId, PhotoId = photoId });
    }

    public Task<Result<RecuerdoDto>> CreateRecuerdoAsync(BaulId baulId, string text) =>
        CreateRecuerdoCoreAsync(new RecuerdoScope(baulId, null, null, null), text, "Recuerdo creation");

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

        var updated = recuerdo.WithText(text);

        // Both commit together — DeleteAsync bulk-deletes the stale embedding via
        // ExecuteDeleteAsync (bypasses the change tracker, see IUnitOfWork's doc comment), so
        // only an ambient transaction makes it atomic with the text update. An edited recuerdo
        // stuck with its old embedding would silently rank/search on stale text.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await recuerdoRepository.UpdateAsync(updated);
            await recuerdoEmbeddingRepository.DeleteAsync(recuerdoId);
            return Result.Success();
        });

        var (nickname, avatarUrl, personaId) = await authorInfoProjector.GetAsync(updated.BaulId, updated.UserId);

        // A photo-scoped recuerdo's chapter is resolved live from the photo's *current* chapter
        // (it may have been moved to a different chapter since the recuerdo was written), not
        // from the recuerdo's own persisted ChapterId snapshot — mirrors RecuerdoListRowFactory.
        // A chapter-scoped recuerdo has no photo to resolve from, so its own ChapterId stays
        // authoritative. See #60.
        var (photoThumbnailUrl, livePhotoChapterId) = await GetPhotoContextAsync(updated.PhotoId);
        var effectiveChapterId = updated.PhotoId is not null ? livePhotoChapterId : updated.ChapterId;
        var chapterName = await GetChapterNameAsync(effectiveChapterId);

        logger.LogInformation("Recuerdo updated {BaulId} {RecuerdoId}", updated.BaulId, updated.Id);

        return ToDto(updated, nickname, avatarUrl, personaId, isOwn: true, photoThumbnailUrl, chapterName, effectiveChapterId);
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
        RecuerdoScope scope, string operationName, bool includeThumbnails, ChapterNameMode chapterNameMode, object? authContext = null)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(scope.BaulId, userId, AccessLevel.Member, operationName, authContext);
        if (auth.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(auth.Error);

        // IRecuerdoListReadModel already carries each row's photo storage key and chapter name
        // (batched), so unlike before there's no separate chapterRepository/photoRepository
        // round trip needed here beyond the author lookup.
        var rows = await FetchRowsAsync(scope);

        // One batched author lookup for the whole list instead of one per recuerdo — a feed
        // is typically a handful of distinct authors across many entries.
        var authorsByUserId = await authorInfoProjector.GetManyAsync(scope.BaulId, rows.Select(r => r.UserId).Distinct());

        var dtos = new List<RecuerdoDto>();
        foreach (var row in rows)
        {
            var (nickname, avatarUrl, personaId) = AuthorInfoProjector.Resolve(authorsByUserId, row.UserId);
            var thumbnailUrl = includeThumbnails && row.PhotoStorageKey is { Length: > 0 }
                ? await photoStorage.GetImageUrl(row.PhotoStorageKey, ImagePlacement.PhotoGridThumbnail)
                : null;
            var chapterName = chapterNameMode switch
            {
                ChapterNameMode.Constant => scope.ChapterName,
                ChapterNameMode.PerChapter => row.ChapterName,
                _ => null
            };
            dtos.Add(ToDto(row, nickname, avatarUrl, personaId, row.UserId == userId, thumbnailUrl, chapterName));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    private async Task<Result<RecuerdoDto>> CreateRecuerdoCoreAsync(RecuerdoScope scope, string text, string operationName, object? authContext = null)
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

    private Task<IReadOnlyList<RecuerdoListRow>> FetchRowsAsync(RecuerdoScope scope) =>
        scope.PhotoId is { } photoId ? recuerdoListReadModel.GetByPhotoIdAsync(photoId)
        : scope.ChapterId is { } chapterId ? recuerdoListReadModel.GetByChapterIdAsync(chapterId)
        : recuerdoListReadModel.GetByBaulIdAsync(scope.BaulId);

    // Used by UpdateRecuerdoAsync, which (unlike CreateRecuerdoCoreAsync) reads back an
    // already-persisted Recuerdo whose ChapterId snapshot may be stale if the photo moved since
    // creation — this also hands back the photo's *current* chapter so the caller can resolve
    // the DTO's ChapterId/ChapterName live instead of trusting that snapshot. See #60.
    private async Task<(string? ThumbnailUrl, ChapterId? ChapterId)> GetPhotoContextAsync(PhotoId? photoId)
    {
        if (photoId is null) return (null, null);

        var photo = await photoRepository.GetByIdAsync(photoId.Value);
        if (photo is null) return (null, null);

        var thumbnailUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
        return (thumbnailUrl, photo.ChapterId);
    }

    private async Task<string?> GetChapterNameAsync(ChapterId? chapterId)
    {
        if (chapterId is null) return null;

        var chapter = await chapterRepository.GetByIdAsync(chapterId.Value);
        return chapter?.Name;
    }

    private static RecuerdoDto ToDto(
        Recuerdo recuerdo, string userName, string? userAvatar, string? personaId, bool isOwn,
        string? photoThumbnailUrl = null, string? chapterName = null, ChapterId? chapterId = null) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId?.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn, photoThumbnailUrl, userAvatar, personaId,
            (chapterId ?? recuerdo.ChapterId)?.ToString(), chapterName);

    // List path — turns an already-batched IRecuerdoListReadModel row into a RecuerdoDto (see
    // GetRecuerdosCoreAsync). Mirrors the Recuerdo overload above field for field, plus
    // SubjectDate (only ever populated here — the row already carries it from the batched
    // photo lookup; the Recuerdo overload above has no Photo in hand, so it leaves it null).
    private static RecuerdoDto ToDto(
        RecuerdoListRow row, string userName, string? userAvatar, string? personaId, bool isOwn,
        string? photoThumbnailUrl, string? chapterName) =>
        new(row.Id.ToString(), row.PhotoId?.ToString(), row.UserId, row.Text, userName,
            row.CreatedAt, isOwn, photoThumbnailUrl, userAvatar, personaId, row.ChapterId?.ToString(), chapterName,
            row.SubjectDate);
}
