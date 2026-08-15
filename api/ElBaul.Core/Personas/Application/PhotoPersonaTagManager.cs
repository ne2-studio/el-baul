using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Core.Personas.Application;
public class PhotoPersonaTagManager(
    ILogger<PhotoPersonaTagManager> logger,
    IPhotoRepository photoRepository,
    IPersonaRepository personaRepository,
    IPhotoStorage photoStorage,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    IUnitOfWork unitOfWork) : IPhotoPersonaTagManager
{
    public async Task<Result<IEnumerable<TaggedPersonaDto>>> GetTaggedPersonasAsync(PhotoId photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null) return Result.Failure<IEnumerable<TaggedPersonaDto>>(ApplicationError.NotFound("Photo not found"));

        var auth = await baulAccess.AuthorizeAsync(
            photo.BaulId, userId, AccessLevel.Member, "Photo tagged personas", new { photo.BaulId, PhotoId = photoId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<TaggedPersonaDto>>(auth.Error);

        var personaIds = (await photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(photoId)).ToList();
        var personasById = (await personaRepository.GetPersonasByIdsAsync(personaIds)).ToDictionary(p => p.Id);
        // Preserves GetPersonaIdsByPhotoIdAsync's order (and its original "skip if the persona
        // was since removed" behavior) now that the fetch itself is batched.
        var personas = personaIds.Select(id => personasById.GetValueOrDefault(id)).OfType<Persona>();
        var dtos = await ToTaggedPersonaDtosAsync(personas);

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
            var persona = await personaRepository.GetPersonaByIdAsync(personaId);
            if (persona is null || persona.BaulId != photo.BaulId)
            {
                logger.LogWarning(
                    "Photo tagging rejected: persona not found in this baúl {BaulId} {PhotoId} {PersonaId}",
                    photo.BaulId, photoId, personaId);
                return Result.Failure<IEnumerable<TaggedPersonaDto>>(ApplicationError.NotFound("Persona not found"));
            }
            personas.Add(persona);
        }

        // SetTagsAsync bulk-deletes the photo's old tags via ExecuteDeleteAsync (bypasses the
        // change tracker, see IUnitOfWork's doc comment) before re-inserting the new set, so
        // only an ambient transaction makes it atomic with the ConfirmedNoPersonas clear below.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await photoPersonaTagRepository.SetTagsAsync(photoId, photo.BaulId, distinctIds, clock.UtcNow());
            // A real tag always wins over a stale "confirmed no personas" — someone tagging the
            // photo later from the viewer should silently undo an earlier (possibly mistaken)
            // confirmation, with no separate "undo" affordance needed.
            if (distinctIds.Count > 0 && photo.ConfirmedNoPersonas)
                await photoRepository.UpdateAsync(photo.WithConfirmedNoPersonas(false));
            return Result.Success();
        });
        logger.LogInformation("Photo tags updated {BaulId} {PhotoId} {PersonaCount}", photo.BaulId, photoId, personas.Count);

        var dtos = new List<TaggedPersonaDto>();
        foreach (var persona in personas) dtos.Add(await ToTaggedPersonaDtoAsync(persona));
        return Result.Success<IEnumerable<TaggedPersonaDto>>(dtos);
    }

    public async Task<Result<IEnumerable<string>>> AddTaggedPersonasBatchAsync(
        BaulId baulId, IEnumerable<PhotoId> photoIds, IEnumerable<PersonaId> personaIds)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Batch photo tagging");
        if (auth.IsFailure) return Result.Failure<IEnumerable<string>>(auth.Error);

        // The persona set is shared by every photo in the batch (they all come from the same
        // baúl-scoped grid), so it's validated once up front rather than per photo — unlike
        // photo validity below, which tolerates individual failures. Batched: one query for
        // every persona in the request instead of one GetPersonaByIdAsync round trip each.
        var distinctPersonaIds = personaIds.Distinct().ToList();
        var personasById = (await personaRepository.GetPersonasByIdsAsync(distinctPersonaIds)).ToDictionary(p => p.Id);
        foreach (var personaId in distinctPersonaIds)
        {
            if (!personasById.TryGetValue(personaId, out var persona) || persona.BaulId != baulId)
            {
                logger.LogWarning("Batch photo tagging rejected: persona not found in this baúl {BaulId} {PersonaId}", baulId, personaId);
                return Result.Failure<IEnumerable<string>>(ApplicationError.NotFound("Persona not found"));
            }
        }

        // Batched: one query for every photo in the request (IPhotoRepository.GetByIdsAsync,
        // the same pattern ToTaggedPersonaDtosAsync below already uses for avatar lookups)
        // instead of one GetByIdAsync per photo, plus one query for all of their existing tags
        // instead of one GetPersonaIdsByPhotoIdAsync per photo. A batch this endpoint's own UI
        // invites making large (select many photos in the grid, tag several people at once) had
        // no cap and no batching, so its query count used to scale directly with selection size.
        var photoIdList = photoIds.ToList();
        var photosById = (await photoRepository.GetByIdsAsync(photoIdList.Distinct()))
            .Where(p => p.BaulId == baulId)
            .ToDictionary(p => p.Id);
        var existingTagsByPhotoId = await photoPersonaTagRepository.GetPersonaIdsByPhotoIdsAsync(photosById.Keys);

        var tagsByPhotoId = new Dictionary<PhotoId, IReadOnlyList<PersonaId>>();
        var confirmedNoPersonasToClear = new List<Photo>();
        var updated = new List<string>();

        foreach (var photoId in photoIdList)
        {
            if (!photosById.TryGetValue(photoId, out var photo))
            {
                logger.LogWarning("Skipping photo in batch tagging: not found in this baúl {BaulId} {PhotoId}", baulId, photoId);
                continue;
            }

            if (!tagsByPhotoId.ContainsKey(photoId))
            {
                var existingIds = existingTagsByPhotoId.GetValueOrDefault(photoId, []);
                tagsByPhotoId[photoId] = existingIds.Concat(distinctPersonaIds).Distinct().ToList();

                // See SetTaggedPersonasAsync: a real tag always wins over a stale confirmation.
                if (distinctPersonaIds.Count > 0 && photo.ConfirmedNoPersonas)
                    confirmedNoPersonasToClear.Add(photo);
            }

            updated.Add(photoId.ToString());
        }

        var now = clock.UtcNow();

        // Same reasoning as SetTaggedPersonasAsync — SetTagsForManyAsync bulk-deletes via
        // ExecuteDeleteAsync, so only an ambient transaction makes it atomic with the
        // ConfirmedNoPersonas clears below.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await photoPersonaTagRepository.SetTagsForManyAsync(baulId, tagsByPhotoId, now);
            foreach (var photo in confirmedNoPersonasToClear)
                await photoRepository.UpdateAsync(photo.WithConfirmedNoPersonas(false));
            return Result.Success();
        });

        logger.LogInformation(
            "Batch photo tagging completed {BaulId} {PhotoCount} {PersonaCount}", baulId, updated.Count, distinctPersonaIds.Count);
        return Result.Success<IEnumerable<string>>(updated);
    }

    private async Task<TaggedPersonaDto> ToTaggedPersonaDtoAsync(Persona persona)
    {
        var avatarUrl = await PersonaAvatarUrlResolver.ResolveAsync(persona, photoRepository, photoStorage);
        return new TaggedPersonaDto(persona.Id.ToString(), persona.Nickname, persona.Name, avatarUrl);
    }

    // Batch-friendly counterpart to ToTaggedPersonaDtoAsync — one avatar-photo lookup
    // (IPhotoRepository.GetByIdsAsync) for the whole tagged-personas list instead of one per
    // persona. Used by GetTaggedPersonasAsync, a pure read; the write paths above still build
    // their (much smaller, already-validated) response DTOs one persona at a time.
    private async Task<IReadOnlyList<TaggedPersonaDto>> ToTaggedPersonaDtosAsync(IEnumerable<Persona> personas)
    {
        var personaList = personas.ToList();
        var avatarPhotoIds = personaList
            .Where(p => p.AvatarPhotoId is not null)
            .Select(p => p.AvatarPhotoId!.Value)
            .Distinct()
            .ToList();
        var photosById = avatarPhotoIds.Count == 0
            ? new Dictionary<PhotoId, Photo>()
            : (await photoRepository.GetByIdsAsync(avatarPhotoIds)).ToDictionary(p => p.Id);

        var dtos = new List<TaggedPersonaDto>(personaList.Count);
        foreach (var persona in personaList)
        {
            var avatarPhoto = persona.AvatarPhotoId is { } photoId ? photosById.GetValueOrDefault(photoId) : null;
            var avatarUrl = await PersonaAvatarUrlResolver.ResolveAsync(persona, avatarPhoto, photoStorage);
            dtos.Add(new TaggedPersonaDto(persona.Id.ToString(), persona.Nickname, persona.Name, avatarUrl));
        }

        return dtos;
    }
}
