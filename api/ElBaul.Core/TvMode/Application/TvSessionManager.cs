using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Sharing.Application;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.TvMode.OutputPorts;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
using ElBaul.Core.TvMode.Domain;
namespace ElBaul.Core.TvMode.Application;

// See docs PRD "Modo TV": a temporary, read-only, anonymous session that hands a TV browser
// every baúl photo plus its context (date, chapter, tagged people, latest recuerdo) in one
// call — GetContentAsync deliberately never goes through BaulAccessService/ICurrentUserProvider
// like SharedLinkManager.GetLandingAsync, since the TV never authenticates as a user; the
// token itself, checked for expiry/revocation, is the only credential.
public class TvSessionManager(
    ILogger<TvSessionManager> logger,
    ITvSessionRepository tvSessionRepository,
    IBaulRepository baulRepository,
    IPersonaRepository personaRepository,
    IPhotoRepository photoRepository,
    IChapterRepository chapterRepository,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    IRecuerdoRepository recuerdoRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IAppConfiguration appConfiguration,
    BaulAccessService baulAccess,
    AuthorInfoProjector authorInfoProjector) : ITvSessionManager
{
    // Cuánto dura el acceso desde que se crea — pasado ese tiempo la TV debe pedir uno nuevo
    // desde el móvil. La caducidad automática (no solo la revocación manual) es la mitigación
    // principal frente a "la sesión queda abierta en una TV ajena" (ver PRD, tabla de riesgos).
    private static readonly TimeSpan SessionDuration = TimeSpan.FromHours(4);

    public async Task<Result<CreateTvSessionResult>> CreateAsync(BaulId baulId)
    {
        if (!appConfiguration.TvModeEnabled)
            return Result.Failure<CreateTvSessionResult>(ApplicationError.NotFound("TV mode is not enabled"));

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "TV session create", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<CreateTvSessionResult>(auth.Error);

        var now = clock.UtcNow();
        var session = new TvSession(
            new TvSessionId(idGenerator.NewId()), TokenGenerator.NewToken(idGenerator), baulId, userId, now, now.Add(SessionDuration));
        await tvSessionRepository.CreateAsync(session);

        logger.LogInformation("TV session created {BaulId} {TvSessionId}", baulId, session.Id);
        return Result.Success(new CreateTvSessionResult(BuildPublicUrl(session.Token), session.Token, session.ExpiresAt));
    }

    public async Task<Result> CancelAsync(string token)
    {
        var session = await tvSessionRepository.GetByTokenAsync(token);
        if (session is null) return Result.Failure(ApplicationError.NotFound("TV session not found"));

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(session.BaulId, userId, AccessLevel.Member, "TV session cancel", new { session.BaulId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        await tvSessionRepository.UpdateAsync(session.Revoke(clock.UtcNow()));
        logger.LogInformation("TV session cancelled {BaulId} {TvSessionId}", session.BaulId, session.Id);
        return Result.Success();
    }

    public async Task<Result<TvSessionContentDto>> GetContentAsync(string token)
    {
        if (!appConfiguration.TvModeEnabled)
            return Result.Failure<TvSessionContentDto>(ApplicationError.NotFound("TV session not found"));

        var session = await tvSessionRepository.GetByTokenAsync(token);
        if (session is null || !session.IsActive(clock.UtcNow()))
            return Result.Failure<TvSessionContentDto>(ApplicationError.NotFound("TV session not found"));

        var baul = await baulRepository.GetByIdAsync(session.BaulId);
        if (baul is null) return Result.Failure<TvSessionContentDto>(ApplicationError.NotFound("TV session not found"));

        var photos = (await photoRepository.GetActiveByBaulIdAsync(session.BaulId)).OrderByChronology().ToList();
        if (photos.Count == 0) return Result.Success(new TvSessionContentDto(baul.Name, []));

        var chapterNamesById = (await chapterRepository.GetByBaulIdAsync(session.BaulId)).ToDictionary(c => c.Id, c => c.Name);

        var photoIds = photos.Select(p => p.Id).ToList();
        var personaIdsByPhoto = await photoPersonaTagRepository.GetPersonaIdsByPhotoIdsAsync(photoIds);
        var allPersonaIds = personaIdsByPhoto.Values.SelectMany(ids => ids).Distinct().ToList();
        var personasById = (await personaRepository.GetPersonasByIdsAsync(allPersonaIds)).ToDictionary(p => p.Id);

        // Latest recuerdo per photo is the "quote" shown in the context overlay — same
        // "most recent wins" choice ChapterDto.latestRecuerdoText already makes for a chapter.
        var latestRecuerdoByPhoto = (await recuerdoRepository.GetByPhotoIdsAsync(photoIds))
            .Where(r => r.PhotoId is not null)
            .GroupBy(r => r.PhotoId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.CreatedAt).First());
        var authorsByUserId = await authorInfoProjector.GetManyAsync(
            session.BaulId, latestRecuerdoByPhoto.Values.Select(r => r.UserId).Distinct());

        var photoDtos = new List<TvPhotoDto>(photos.Count);
        foreach (var photo in photos)
        {
            var imageUrl = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoFull);
            var chapterName = photo.ChapterId is { } chapterId ? chapterNamesById.GetValueOrDefault(chapterId) : null;
            var personaNames = personaIdsByPhoto.GetValueOrDefault(photo.Id, [])
                .Select(id => personasById.GetValueOrDefault(id)?.Nickname)
                .OfType<string>()
                .ToList();
            var latestRecuerdo = latestRecuerdoByPhoto.GetValueOrDefault(photo.Id);
            var quoteAuthor = latestRecuerdo is not null
                ? AuthorInfoProjector.Resolve(authorsByUserId, latestRecuerdo.UserId).Nickname
                : null;

            photoDtos.Add(new TvPhotoDto(
                photo.Id.ToString(), imageUrl, photo.TakenAt?.Year, photo.TakenAt?.Month, photo.TakenAt?.Day,
                chapterName, personaNames, latestRecuerdo?.Text, quoteAuthor));
        }

        return Result.Success(new TvSessionContentDto(baul.Name, photoDtos));
    }

    private string BuildPublicUrl(string token) =>
        $"{appConfiguration.PublicUrl.TrimEnd('/')}/tv/{Uri.EscapeDataString(token)}";
}
