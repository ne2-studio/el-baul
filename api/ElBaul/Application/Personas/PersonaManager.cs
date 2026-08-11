using ElBaul.Application.Bauls;
using ElBaul.Application.Personas;
using ElBaul.Application.Photos;
using ElBaul.InputPorts.Personas;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;
using Ne2Studio.Common;
using Microsoft.Extensions.Logging;
// Disambiguates from OutputPorts.Bauls.BaulAccess (the "baúl + role" DTO from
// IBaulRepository.GetSharedForUserAsync) — this file means the authorization-check type
// returned by BaulAccessService.AuthorizeAsync.
using BaulAccess = ElBaul.Application.Bauls.BaulAccess;

using ElBaul.Domain;
namespace ElBaul.Application.Personas;
public class PersonaManager(
    ILogger<PersonaManager> logger,
    IBaulRepository baulRepository,
    IPhotoRepository photoRepository,
    IUserRepository userRepository,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    PhotoFileService photoFileService,
    IPersonaDtoProjector personaDtoProjector,
    IUnitOfWork unitOfWork) : IPersonaManager
{
    public async Task<Result<IEnumerable<PersonaDto>>> GetPersonasAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Personas list", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PersonaDto>>(auth.Error);
        var access = auth.Value;

        var personas = (await baulRepository.GetPersonasAsync(baulId)).ToList();

        // One batched user lookup for every claimed persona instead of one round trip each,
        // plus IPersonaDtoProjector.ProjectManyAsync batching the avatar-photo lookup the same
        // way — together this turns what used to be up to 2 queries per persona into 2 fixed
        // queries for the whole list.
        var claimedUserIds = personas.Where(p => p.IsClaimed).Select(p => p.UserId!.Value).Distinct();
        var usersById = (await userRepository.GetByIdsAsync(claimedUserIds)).ToDictionary(u => u.Id);

        var items = personas.Select(persona => (
            Persona: persona,
            User: persona.IsClaimed ? usersById.GetValueOrDefault(persona.UserId!.Value) : null,
            CanEdit: CanEditPersona(persona, userId, access)));

        var dtos = await personaDtoProjector.ProjectManyAsync(items, access.Baul.CustodioId);
        return Result.Success<IEnumerable<PersonaDto>>(dtos);
    }

    public async Task<Result<PersonaDto>> GetPersonaAsync(BaulId baulId, PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona detail", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);
        var access = auth.Value;

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning("Persona detail rejected: persona not found {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Persona not found"));
        }

        var canEdit = CanEditPersona(persona, userId, access);
        var user = persona.IsClaimed ? await userRepository.GetByIdAsync(persona.UserId!.Value) : null;
        return await personaDtoProjector.ProjectAsync(persona, user, canEdit, access.Baul.CustodioId);
    }

    public async Task<Result<PersonaDto>> CreatePersonaAsync(BaulId baulId, string nickname)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Persona creation", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = new Persona(
            new PersonaId(idGenerator.NewId()), baulId, null, nickname, BaulRole.Colaborador, clock.UtcNow());

        await baulRepository.AddPersonaAsync(persona);
        logger.LogInformation("Persona created {PersonaId} {Nickname}", persona.Id, nickname);
        return await personaDtoProjector.ProjectAsync(persona, null, canEdit: true, auth.Value.Baul.CustodioId);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaAsync(BaulId baulId, PersonaId personaId, string? name, string nickname)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning("Persona update rejected: persona not found {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Persona not found"));
        }

        var canEdit = CanEditPersona(persona, userId, auth.Value);
        if (!canEdit)
        {
            logger.LogWarning("Persona update rejected: access denied {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.Forbidden("Access denied"));
        }

        var updated = persona with { Name = name, Nickname = nickname };
        await baulRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona updated {PersonaId}", personaId);

        var user = updated.IsClaimed ? await userRepository.GetByIdAsync(updated.UserId!.Value) : null;
        return await personaDtoProjector.ProjectAsync(updated, user, canEdit, auth.Value.Baul.CustodioId);
    }

    // Biografía is shared, wiki-like family content: unlike name/nickname/avatar it only
    // requires baúl membership, not CanEditPersona's identity-edit permission.
    public async Task<Result<PersonaDto>> UpdatePersonaBiografiaAsync(BaulId baulId, PersonaId personaId, string? biografia)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona biografia update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning("Persona biografia update rejected: persona not found {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Persona not found"));
        }

        var updated = persona with { Biografia = biografia };
        await baulRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona biografia updated {PersonaId}", personaId);

        var user = updated.IsClaimed ? await userRepository.GetByIdAsync(updated.UserId!.Value) : null;
        return await personaDtoProjector.ProjectAsync(updated, user, CanEditPersona(updated, userId, auth.Value), auth.Value.Baul.CustodioId);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaAvatarAsync(
        BaulId baulId,
        PersonaId personaId,
        Stream content,
        string fileName,
        string contentType,
        AvatarCrop crop,
        ClientUploadId clientUploadId)
    {
        var context = await AuthorizePersonaAvatarChangeAsync(baulId, personaId);
        if (context.IsFailure) return Result.Failure<PersonaDto>(context.Error);
        var (persona, access, userId) = context.Value;

        var existingPhoto = await photoRepository.GetByClientUploadIdAsync(clientUploadId);
        Photo photo;
        if (existingPhoto is not null)
        {
            if (existingPhoto.BaulId != baulId || existingPhoto.Status != PhotoStatus.Active)
                return Result.Failure<PersonaDto>(ApplicationError.NotFound("Photo not found"));

            photo = existingPhoto;
            logger.LogInformation(
                "Duplicate persona avatar upload reused existing loose photo {PersonaId} {PhotoId} {ClientUploadId}",
                personaId, photo.Id, clientUploadId);
        }
        else
        {
            StoredPhotoFile storedFile;
            try
            {
                storedFile = await photoFileService.SaveForUploadAsync(userId, fileName, contentType, content, explicitDate: null);
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Persona avatar upload failed while saving to storage {PersonaId} {FileName} {ContentType}",
                    personaId, fileName, contentType);
                throw;
            }

            photo = Photo.Create(new PhotoId(idGenerator.NewId()), null, baulId, storedFile.StorageKey, storedFile.Date, userId, clock.UtcNow(), clientUploadId);
            try
            {
                // Both writes commit together — see PhotoManager.UploadPhotoAsync for the same
                // pattern and why a partial write here needs the same storage cleanup below.
                await unitOfWork.ExecuteInTransactionAsync(async () =>
                {
                    await photoRepository.CreateAsync(photo);
                    await baulRepository.UpdateAsync(access.Baul.WithPhotoAdded(photo, clock.UtcNow()));
                    return Result.Success();
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Persona avatar upload failed while persisting photo metadata {PersonaId} {PhotoId} {StorageKey}",
                    personaId, photo.Id, storedFile.StorageKey);
                await photoFileService.TryDeleteOrphanedStorageObjectAsync(storedFile.StorageKey);
                throw;
            }
        }

        return await ApplyPersonaAvatarPhotoAsync(persona, access, userId, photo, crop);
    }

    public async Task<Result<PersonaDto>> SetPersonaAvatarPhotoAsync(BaulId baulId, PersonaId personaId, PhotoId photoId, AvatarCrop crop)
    {
        var context = await AuthorizePersonaAvatarChangeAsync(baulId, personaId);
        if (context.IsFailure) return Result.Failure<PersonaDto>(context.Error);
        var (persona, access, userId) = context.Value;

        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null || photo.BaulId != baulId || photo.Status != PhotoStatus.Active)
        {
            logger.LogWarning(
                "Persona avatar photo selection rejected: photo not found in this baúl {PersonaId} {PhotoId}",
                personaId, photoId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Photo not found"));
        }

        return await ApplyPersonaAvatarPhotoAsync(persona, access, userId, photo, crop);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaRoleAsync(BaulId baulId, PersonaId personaId, BaulRole role)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Persona role update", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning("Persona role update rejected: persona not found {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Persona not found"));
        }

        // Custody isn't a role this endpoint can grant or take away — it can't even be asked
        // for, since BaulRole has no Custodio value (see BaulRole.cs). Touching the actual
        // custodio's own row would let one strip their own protected status, so that's the one
        // case left to block. Ownership only ever moves via Baul.CustodioId.
        if (persona.IsCustodioProtected(auth.Value.Baul.CustodioId))
        {
            logger.LogWarning("Persona role update rejected: custodio role cannot be changed {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.Validation("The custodio role cannot be changed"));
        }

        var updated = persona with { Role = role };
        await baulRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona role updated {PersonaId} {Role}", personaId, role);

        var user = updated.IsClaimed ? await userRepository.GetByIdAsync(updated.UserId!.Value) : null;
        return await personaDtoProjector.ProjectAsync(updated, user, canEdit: true, auth.Value.Baul.CustodioId);
    }

    public async Task<Result> RemovePersonaAsync(BaulId baulId, PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Persona removal", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning("Persona access revocation rejected: persona not found {PersonaId}", personaId);
            return Result.Failure(ApplicationError.NotFound("Persona not found"));
        }

        if (persona.IsCustodioProtected(auth.Value.Baul.CustodioId))
        {
            logger.LogWarning("Persona access revocation rejected: custodio cannot lose access {PersonaId}", personaId);
            return Result.Failure(ApplicationError.Validation("The custodio cannot lose access"));
        }

        await baulRepository.UpdatePersonaAsync(persona.Revoke());
        logger.LogInformation("Persona access revoked {PersonaId}", personaId);
        return Result.Success();
    }

    private static bool CanEditPersona(Persona target, UserId callerUserId, BaulAccess callerAccess) =>
        callerAccess.IsAdmin || (target.AccessStatus == PersonaAccessStatus.Active && target.UserId == callerUserId);

    private async Task<Result<(Persona Persona, BaulAccess Access, UserId UserId)>> AuthorizePersonaAvatarChangeAsync(BaulId baulId, PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona avatar update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<(Persona, BaulAccess, UserId)>(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning("Persona avatar update rejected: persona not found {PersonaId}", personaId);
            return Result.Failure<(Persona, BaulAccess, UserId)>(ApplicationError.NotFound("Persona not found"));
        }

        if (!CanEditPersona(persona, userId, auth.Value))
        {
            logger.LogWarning("Persona avatar update rejected: access denied {PersonaId}", personaId);
            return Result.Failure<(Persona, BaulAccess, UserId)>(ApplicationError.Forbidden("Access denied"));
        }

        return (persona, auth.Value, userId);
    }

    private async Task<Result<PersonaDto>> ApplyPersonaAvatarPhotoAsync(Persona persona, BaulAccess access, UserId userId, Photo photo, AvatarCrop crop)
    {
        var existingIds = (await photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(photo.Id)).ToList();

        var updated = persona with
        {
            AvatarPhotoKey = null,
            AvatarPhotoId = photo.Id,
            AvatarCropX = crop.X,
            AvatarCropY = crop.Y,
            AvatarCropScale = crop.Scale
        };

        // Tagging the persona into their own new avatar photo and assigning the avatar commit
        // together — SetTagsAsync bulk-deletes/reinserts via ExecuteDeleteAsync (bypasses the
        // change tracker, see IUnitOfWork's doc comment), so only an ambient transaction makes
        // it atomic with the persona update.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (!existingIds.Contains(persona.Id))
            {
                await photoPersonaTagRepository.SetTagsAsync(photo.Id, photo.BaulId, existingIds.Append(persona.Id), clock.UtcNow());
            }

            await baulRepository.UpdatePersonaAsync(updated);
            return Result.Success();
        });
        logger.LogInformation("Persona avatar photo updated {PersonaId} {PhotoId}", persona.Id, photo.Id);

        var user = updated.IsClaimed ? await userRepository.GetByIdAsync(updated.UserId!.Value) : null;
        return await personaDtoProjector.ProjectAsync(updated, user, CanEditPersona(updated, userId, access), access.Baul.CustodioId);
    }
}
