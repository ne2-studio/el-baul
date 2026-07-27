using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

public class RecuerdoManager(
    ILogger<RecuerdoManager> logger,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IPhotoStorage photoStorage,
    BaulAccessService baulAccess) : IRecuerdoManager
{
    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid photoId)
    {
        var id = new PhotoId(photoId);
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(id);
        if (photo is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Photo not found");

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo recuerdos", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<RecuerdoDto>>(auth.Error);

        var recuerdos = await recuerdoRepository.GetByPhotoIdAsync(id);
        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var (nickname, avatarUrl, personaId) = await baulAccess.GetAuthorInfoAsync(photo.BaulId, recuerdo.UserId, photoStorage);
            dtos.Add(ToDto(recuerdo, nickname, avatarUrl, personaId, recuerdo.UserId == userId));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid photoId, string text)
    {
        var id = new PhotoId(photoId);
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(id);
        if (photo is null)
        {
            logger.LogWarning("Recuerdo creation rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<RecuerdoDto>("Photo not found");
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Recuerdo creation", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<RecuerdoDto>(auth.Error);

        var (nickname, avatarUrl, personaId) = await baulAccess.GetAuthorInfoAsync(photo.BaulId, userId, photoStorage);
        var recuerdo = new Recuerdo(new RecuerdoId(idGenerator.NewId()), id, photo.ChapterId, photo.BaulId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation(
            "Recuerdo created {BaulId} {PhotoId} {RecuerdoId}", photo.BaulId, photoId, recuerdo.Id);

        return ToDto(recuerdo, nickname, avatarUrl, personaId, isOwn: true);
    }

    private static RecuerdoDto ToDto(Recuerdo recuerdo, string userName, string? userAvatar, string? personaId, bool isOwn) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId?.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn, UserAvatar: userAvatar, PersonaId: personaId);
}
