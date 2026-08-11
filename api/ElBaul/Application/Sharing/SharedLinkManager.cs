using ElBaul.Application.Bauls;
using ElBaul.Application.Personas;
using ElBaul.Application.Sharing;
using ElBaul.InputPorts.Sharing;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Sharing;
using ElBaul.OutputPorts.Users;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Sharing;
public class SharedLinkManager(
    ILogger<SharedLinkManager> logger,
    ISharedLinkRepository sharedLinkRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IBaulRepository baulRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IAppConfiguration appConfiguration,
    BaulAccessService baulAccess,
    AuthorInfoProjector authorInfoProjector) : ISharedLinkManager
{
    public async Task<Result<CreateSharedLinkResult>> CreateForPhotoAsync(PhotoId photoId)
    {
        if (!appConfiguration.SharedLinksEnabled)
            return Result.Failure<CreateSharedLinkResult>(ApplicationError.NotFound("Shared links are not enabled"));

        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null || photo.Status != PhotoStatus.Active)
            return Result.Failure<CreateSharedLinkResult>(ApplicationError.NotFound("Photo not found"));

        var auth = await baulAccess.AuthorizeAsync(photo.BaulId, userId, AccessLevel.Member, "Photo share", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<CreateSharedLinkResult>(auth.Error);

        var sharedLink = new SharedLink(
            new SharedLinkId(idGenerator.NewId()), TokenGenerator.NewToken(idGenerator), photo.BaulId, SharedLinkContentType.Photo,
            photo.Id, null, userId, clock.UtcNow());
        await sharedLinkRepository.CreateAsync(sharedLink);

        logger.LogInformation("Shared link created {BaulId} {PhotoId} {SharedLinkId}", photo.BaulId, photoId, sharedLink.Id);
        return Result.Success(new CreateSharedLinkResult(BuildPublicUrl(sharedLink.Token), sharedLink.Token));
    }

    public async Task<Result<CreateSharedLinkResult>> CreateForRecuerdoAsync(RecuerdoId recuerdoId)
    {
        if (!appConfiguration.SharedLinksEnabled)
            return Result.Failure<CreateSharedLinkResult>(ApplicationError.NotFound("Shared links are not enabled"));

        var userId = currentUserProvider.GetUserId();
        var recuerdo = await recuerdoRepository.GetByIdAsync(recuerdoId);
        if (recuerdo is null) return Result.Failure<CreateSharedLinkResult>(ApplicationError.NotFound("Recuerdo not found"));

        var photo = recuerdo.PhotoId is { } photoId ? await photoRepository.GetByIdAsync(photoId) : null;
        if (recuerdo.PhotoId is not null && (photo is null || photo.Status != PhotoStatus.Active))
            return Result.Failure<CreateSharedLinkResult>(ApplicationError.NotFound("Recuerdo not found"));

        var auth = await baulAccess.AuthorizeAsync(recuerdo.BaulId, userId, AccessLevel.Member, "Recuerdo share", new { recuerdo.BaulId, RecuerdoId = recuerdoId });
        if (auth.IsFailure) return Result.Failure<CreateSharedLinkResult>(auth.Error);

        var sharedLink = new SharedLink(
            new SharedLinkId(idGenerator.NewId()), TokenGenerator.NewToken(idGenerator), recuerdo.BaulId, SharedLinkContentType.Recuerdo,
            recuerdo.PhotoId, recuerdo.Id, userId, clock.UtcNow());
        await sharedLinkRepository.CreateAsync(sharedLink);

        logger.LogInformation("Shared link created {BaulId} {RecuerdoId} {SharedLinkId}", recuerdo.BaulId, recuerdoId, sharedLink.Id);
        return Result.Success(new CreateSharedLinkResult(BuildPublicUrl(sharedLink.Token), sharedLink.Token));
    }

    public async Task<Result<SharedLinkLandingDto>> GetLandingAsync(string token)
    {
        if (!appConfiguration.SharedLinksEnabled)
            return Result.Failure<SharedLinkLandingDto>(ApplicationError.NotFound("Shared link not found"));

        var sharedLink = await sharedLinkRepository.GetByTokenAsync(token);
        if (sharedLink is null || sharedLink.IsRevoked)
            return Result.Failure<SharedLinkLandingDto>(ApplicationError.NotFound("Shared link not found"));

        var baul = await baulRepository.GetByIdAsync(sharedLink.BaulId);
        if (baul is null) return Result.Failure<SharedLinkLandingDto>(ApplicationError.NotFound("Shared link not found"));

        var photo = sharedLink.PhotoId is { } photoId ? await photoRepository.GetByIdAsync(photoId) : null;
        if (sharedLink.PhotoId is not null && (photo is null || photo.Status != PhotoStatus.Active))
            return Result.Failure<SharedLinkLandingDto>(ApplicationError.NotFound("Shared link not found"));

        var recuerdo = sharedLink.RecuerdoId is { } recuerdoId
            ? await recuerdoRepository.GetByIdAsync(recuerdoId)
            : (photo is not null ? (await recuerdoRepository.GetByPhotoIdAsync(photo.Id)).FirstOrDefault() : null);
        var imageUrl = photo is not null
            ? await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoFull)
            : null;
        var authorName = recuerdo is not null
            ? (await authorInfoProjector.GetAsync(recuerdo.BaulId, recuerdo.UserId)).Nickname
            : null;

        var title = recuerdo is not null ? $"Un recuerdo de {baul.Name}" : $"Una foto de {baul.Name}";
        var description = recuerdo is not null
            ? Truncate(recuerdo.Text, 180)
            : "Han compartido contigo una foto familiar en El Baúl.";
        var appUrl = BuildAppUrl(sharedLink, photo);

        return Result.Success(new SharedLinkLandingDto(
            title, description, imageUrl, appUrl, recuerdo?.Text,
            string.IsNullOrWhiteSpace(authorName) ? null : authorName,
            recuerdo?.CreatedAt ?? sharedLink.CreatedAt));
    }

    public async Task<Result> RevokeAsync(string token)
    {
        var sharedLink = await sharedLinkRepository.GetByTokenAsync(token);
        if (sharedLink is null) return Result.Failure(ApplicationError.NotFound("Shared link not found"));

        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(sharedLink.BaulId, userId, AccessLevel.Admin, "Shared link revoke", new { sharedLink.BaulId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        await sharedLinkRepository.UpdateAsync(sharedLink with { RevokedAt = clock.UtcNow() });
        logger.LogInformation("Shared link revoked {BaulId} {SharedLinkId}", sharedLink.BaulId, sharedLink.Id);
        return Result.Success();
    }

    private string BuildPublicUrl(string token) =>
        $"{appConfiguration.ApiPublicUrl.TrimEnd('/')}/s/{Uri.EscapeDataString(token)}";

    private string BuildAppUrl(SharedLink sharedLink, Photo? photo)
    {
        var baseUrl = appConfiguration.PublicUrl.TrimEnd('/');
        if (photo is not null)
        {
            return photo.ChapterId is { } chapterId
                ? $"{baseUrl}/baules/{sharedLink.BaulId}/capitulos/{chapterId}/foto/{photo.Id}"
                : $"{baseUrl}/baules/{sharedLink.BaulId}/fotos-sueltas/foto/{photo.Id}";
        }
        return $"{baseUrl}/baules/{sharedLink.BaulId}";
    }

    private static string Truncate(string text, int maxLength) =>
        text.Length <= maxLength ? text : text[..(maxLength - 1)] + "…";
}
