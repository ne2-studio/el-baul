using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

public class PhotoPersonaTagManager(
    ILogger<PhotoPersonaTagManager> logger,
    IPhotoRepository photoRepository,
    IBaulRepository baulRepository,
    IPhotoStorage photoStorage,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IPhotoPersonaTagRepository photoPersonaTagRepository) : IPhotoPersonaTagManager
{
    public async Task<Result<IEnumerable<TaggedPersonaDto>>> GetTaggedPersonasAsync(PhotoId photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null) return Result.Failure<IEnumerable<TaggedPersonaDto>>(ApplicationError.NotFound("Photo not found"));

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo tagged personas", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<TaggedPersonaDto>>(auth.Error);

        var personaIds = await photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(photoId);
        var dtos = new List<TaggedPersonaDto>();
        foreach (var personaId in personaIds)
        {
            var persona = await baulRepository.GetPersonaByIdAsync(personaId);
            if (persona is not null) dtos.Add(await ToTaggedPersonaDtoAsync(persona));
        }

        return Result.Success<IEnumerable<TaggedPersonaDto>>(dtos);
    }

    public async Task<Result<IEnumerable<TaggedPersonaDto>>> SetTaggedPersonasAsync(PhotoId photoId, IEnumerable<PersonaId> personaIds)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning("Photo tagging rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<IEnumerable<TaggedPersonaDto>>(ApplicationError.NotFound("Photo not found"));
        }

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo tagging", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<TaggedPersonaDto>>(auth.Error);

        var distinctIds = personaIds.Distinct().ToList();
        var personas = new List<Persona>();
        foreach (var personaId in distinctIds)
        {
            var persona = await baulRepository.GetPersonaByIdAsync(personaId);
            if (persona is null || persona.BaulId != photo.BaulId)
            {
                logger.LogWarning(
                    "Photo tagging rejected: persona not found in this baúl {BaulId} {PhotoId} {PersonaId}",
                    photo.BaulId, photoId, personaId);
                return Result.Failure<IEnumerable<TaggedPersonaDto>>(ApplicationError.NotFound("Persona not found"));
            }
            personas.Add(persona);
        }

        await photoPersonaTagRepository.SetTagsAsync(photoId, photo.BaulId, distinctIds, clock.UtcNow());
        logger.LogInformation("Photo tags updated {BaulId} {PhotoId} {PersonaCount}", photo.BaulId, photoId, personas.Count);

        var dtos = new List<TaggedPersonaDto>();
        foreach (var persona in personas) dtos.Add(await ToTaggedPersonaDtoAsync(persona));
        return Result.Success<IEnumerable<TaggedPersonaDto>>(dtos);
    }

    public async Task<Result<IEnumerable<string>>> AddTaggedPersonasBatchAsync(
        BaulId baulId, IEnumerable<PhotoId> photoIds, IEnumerable<PersonaId> personaIds)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Batch photo tagging", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<string>>(auth.Error);

        // The persona set is shared by every photo in the batch (they all come from the same
        // baúl-scoped grid), so it's validated once up front rather than per photo — unlike
        // photo validity below, which tolerates individual failures.
        var distinctPersonaIds = personaIds.Distinct().ToList();
        foreach (var personaId in distinctPersonaIds)
        {
            var persona = await baulRepository.GetPersonaByIdAsync(personaId);
            if (persona is null || persona.BaulId != baulId)
            {
                logger.LogWarning("Batch photo tagging rejected: persona not found in this baúl {BaulId} {PersonaId}", baulId, personaId);
                return Result.Failure<IEnumerable<string>>(ApplicationError.NotFound("Persona not found"));
            }
        }

        var now = clock.UtcNow();
        var updated = new List<string>();
        foreach (var photoId in photoIds)
        {
            var photo = await photoRepository.GetByIdAsync(photoId);
            if (photo is null || photo.BaulId != baulId)
            {
                logger.LogWarning("Skipping photo in batch tagging: not found in this baúl {BaulId} {PhotoId}", baulId, photoId);
                continue;
            }

            var existingIds = await photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(photoId);
            var union = existingIds.Concat(distinctPersonaIds).Distinct().ToList();
            await photoPersonaTagRepository.SetTagsAsync(photoId, baulId, union, now);
            updated.Add(photoId.ToString());
        }

        logger.LogInformation(
            "Batch photo tagging completed {BaulId} {PhotoCount} {PersonaCount}", baulId, updated.Count, distinctPersonaIds.Count);
        return Result.Success<IEnumerable<string>>(updated);
    }

    private async Task<TaggedPersonaDto> ToTaggedPersonaDtoAsync(Persona persona)
    {
        string? avatarUrl = null;
        if (persona.AvatarPhotoId is { } photoId)
        {
            var photo = await photoRepository.GetByIdAsync(photoId);
            avatarUrl = photo is not null && photo.BaulId == persona.BaulId && photo.Status == PhotoStatus.Active
                ? await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PersonaAvatar)
                : null;
        }
        else if (persona.AvatarPhotoKey is { Length: > 0 })
        {
            avatarUrl = await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar);
        }
        return new TaggedPersonaDto(persona.Id.ToString(), persona.Nickname, persona.Name, avatarUrl);
    }
}
