using Microsoft.Extensions.Logging;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class PersonaManager(
    ILogger<PersonaManager> logger,
    IBaulRepository baulRepository,
    IPhotoRepository photoRepository,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    PhotoFileService photoFileService) : IPersonaManager
{
    public async Task<Result<BaulPreviewDto>> GetInvitePreviewAsync(PersonaId personaId)
    {
        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.IsClaimed || persona.Role == BaulRole.SinAcceso)
            return Result.Failure<BaulPreviewDto>(ApplicationError.NotFound("Invitation not found"));

        var baul = await baulRepository.GetByIdAsync(persona.BaulId);
        if (baul is null) return Result.Failure<BaulPreviewDto>(ApplicationError.NotFound("Baul not found"));

        var photos = await photoRepository.GetPreviewPhotosAsync(baul.Id, 4);
        var urls = new List<string>();
        foreach (var photo in photos)
        {
            urls.Add(await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.InvitationPreview));
        }

        return new BaulPreviewDto(baul.Id.ToString(), baul.Name, baul.Description, persona.Nickname, urls);
    }

    public async Task<Result<PersonaDto>> AcceptPersonalInviteAsync(PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null)
        {
            logger.LogWarning("Personal invitation acceptance rejected: persona not found {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Invitation not found"));
        }

        if (persona.Role == BaulRole.SinAcceso)
        {
            logger.LogWarning("Personal invitation acceptance rejected: access revoked {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Invitation not found"));
        }

        if (persona.IsClaimed && persona.UserId != userId)
        {
            logger.LogWarning("Personal invitation acceptance rejected: already claimed {PersonaId}", personaId);
            return Result.Failure<PersonaDto>(ApplicationError.Validation("This invitation has already been used"));
        }

        if (!persona.IsClaimed)
        {
            // The caller may already belong to this baúl under a different Persona row
            // (e.g. they're its custodio, or already claimed another Persona here) — the
            // (BaulId, UserId) unique index would reject that at the DB level, so check first
            // and fail cleanly instead of surfacing a raw constraint-violation error.
            var existingMembership = await baulRepository.GetPersonaByUserIdAsync(persona.BaulId, userId);
            if (existingMembership is not null)
            {
                logger.LogWarning(
                    "Personal invitation acceptance rejected: caller already has access to this baul {PersonaId} {BaulId}",
                    personaId, persona.BaulId);
                return Result.Failure<PersonaDto>(ApplicationError.Validation("You already have access to this baúl with a different account link"));
            }

            persona = persona with { UserId = userId, Name = persona.Name ?? user?.Name };
            await baulRepository.UpdatePersonaAsync(persona);
            logger.LogInformation("Personal invitation accepted {PersonaId} {BaulId}", personaId, persona.BaulId);
        }

        return await ToPersonaDtoAsync(persona, user, canEdit: true);
    }

    public async Task<Result<IEnumerable<PersonaDto>>> GetPersonasAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Personas list", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<PersonaDto>>(auth.Error);
        var access = auth.Value;

        var personas = await baulRepository.GetPersonasAsync(baulId);
        var dtos = new List<PersonaDto>();

        foreach (var persona in personas)
        {
            var user = persona.IsClaimed ? await userRepository.GetByIdAsync(persona.UserId!) : null;
            var canEdit = CanEditPersona(persona, userId, access);
            dtos.Add(await ToPersonaDtoAsync(persona, user, canEdit));
        }

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
            logger.LogWarning("Persona detail rejected: persona not found {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Persona not found"));
        }

        var canEdit = CanEditPersona(persona, userId, access);
        var user = persona.IsClaimed ? await userRepository.GetByIdAsync(persona.UserId!) : null;
        return await ToPersonaDtoAsync(persona, user, canEdit);
    }

    public async Task<Result<PersonaDto>> CreatePersonaAsync(BaulId baulId, string nickname)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Persona creation", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = new Persona(
            new PersonaId(idGenerator.NewId()), baulId, null, nickname, BaulRole.Colaborador, clock.UtcNow());

        await baulRepository.AddPersonaAsync(persona);
        logger.LogInformation("Persona created {BaulId} {PersonaId} {Nickname}", baulId, persona.Id, nickname);
        return await ToPersonaDtoAsync(persona, null, canEdit: true);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaAsync(BaulId baulId, PersonaId personaId, string? name, string nickname, string? biografia)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning("Persona update rejected: persona not found {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Persona not found"));
        }

        // Biografía is shared, wiki-like family content: any baúl member may write it for any
        // persona. Name/nickname stay identity fields, gated by CanEditPersona as before.
        var canEdit = CanEditPersona(persona, userId, auth.Value);
        var identityChanged = (name ?? "") != (persona.Name ?? "") || nickname != persona.Nickname;
        if (identityChanged && !canEdit)
        {
            logger.LogWarning("Persona update rejected: access denied {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>(ApplicationError.Forbidden("Access denied"));
        }

        var updated = persona with { Name = name, Nickname = nickname, Biografia = biografia };
        await baulRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona updated {BaulId} {PersonaId}", baulId, personaId);

        var user = updated.IsClaimed ? await userRepository.GetByIdAsync(updated.UserId!) : null;
        return await ToPersonaDtoAsync(updated, user, canEdit);
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
                "Duplicate persona avatar upload reused existing loose photo {BaulId} {PersonaId} {PhotoId} {ClientUploadId}",
                baulId, personaId, photo.Id, clientUploadId);
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
                    "Persona avatar upload failed while saving to storage {BaulId} {PersonaId} {FileName} {ContentType}",
                    baulId, personaId, fileName, contentType);
                throw;
            }

            photo = Photo.Create(new PhotoId(idGenerator.NewId()), null, baulId, storedFile.StorageKey, storedFile.Date, userId, clock.UtcNow(), clientUploadId);
            try
            {
                await photoRepository.CreateAsync(photo);
                await baulRepository.UpdateAsync(access.Baul.WithPhotoAdded(photo, clock.UtcNow()));
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Persona avatar upload failed while persisting photo metadata {BaulId} {PersonaId} {PhotoId} {StorageKey}",
                    baulId, personaId, photo.Id, storedFile.StorageKey);
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
                "Persona avatar photo selection rejected: photo not found in this baúl {BaulId} {PersonaId} {PhotoId}",
                baulId, personaId, photoId);
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
            logger.LogWarning(
                "Persona role update rejected: persona not found {BaulId} {PersonaId}",
                baulId, personaId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Persona not found"));
        }

        var updated = persona with { Role = role };
        await baulRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona role updated {BaulId} {PersonaId} {Role}", baulId, personaId, role);

        var user = updated.IsClaimed ? await userRepository.GetByIdAsync(updated.UserId!) : null;
        return await ToPersonaDtoAsync(updated, user, canEdit: true);
    }

    public async Task<Result> RemovePersonaAsync(BaulId baulId, PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Persona removal", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning("Persona access revocation rejected: persona not found {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure(ApplicationError.NotFound("Persona not found"));
        }

        if (persona.Role == BaulRole.Custodio || persona.UserId == auth.Value.Baul.CustodioId)
        {
            logger.LogWarning("Persona access revocation rejected: custodio cannot lose access {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure(ApplicationError.Validation("The custodio cannot lose access"));
        }

        var updated = persona with { UserId = null, Role = BaulRole.SinAcceso };
        await baulRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona access revoked {BaulId} {PersonaId}", baulId, personaId);
        return Result.Success();
    }

    private static bool CanEditPersona(Persona target, string callerUserId, BaulAccess callerAccess) =>
        callerAccess.IsAdmin || (target.IsClaimed && target.UserId == callerUserId);

    private async Task<Result<(Persona Persona, BaulAccess Access, string UserId)>> AuthorizePersonaAvatarChangeAsync(BaulId baulId, PersonaId personaId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona avatar update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<(Persona, BaulAccess, string)>(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning(
                "Persona avatar update rejected: persona not found {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<(Persona, BaulAccess, string)>(ApplicationError.NotFound("Persona not found"));
        }

        if (!CanEditPersona(persona, userId, auth.Value))
        {
            logger.LogWarning(
                "Persona avatar update rejected: access denied {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<(Persona, BaulAccess, string)>(ApplicationError.Forbidden("Access denied"));
        }

        return (persona, auth.Value, userId);
    }

    private async Task<Result<PersonaDto>> ApplyPersonaAvatarPhotoAsync(Persona persona, BaulAccess access, string userId, Photo photo, AvatarCrop crop)
    {
        var existingIds = (await photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(photo.Id)).ToList();
        if (!existingIds.Contains(persona.Id))
        {
            await photoPersonaTagRepository.SetTagsAsync(photo.Id, photo.BaulId, existingIds.Append(persona.Id), clock.UtcNow());
        }

        var updated = persona with
        {
            AvatarPhotoKey = null,
            AvatarPhotoId = photo.Id,
            AvatarCropX = crop.X,
            AvatarCropY = crop.Y,
            AvatarCropScale = crop.Scale
        };
        await baulRepository.UpdatePersonaAsync(updated);
        logger.LogInformation(
            "Persona avatar photo updated {BaulId} {PersonaId} {PhotoId}", photo.BaulId, persona.Id, photo.Id);

        var user = updated.IsClaimed ? await userRepository.GetByIdAsync(updated.UserId!) : null;
        return await ToPersonaDtoAsync(updated, user, CanEditPersona(updated, userId, access));
    }

    private async Task<PersonaDto> ToPersonaDtoAsync(Persona persona, User? user, bool canEdit)
    {
        var avatarUrl = await GetPersonaAvatarUrlAsync(persona);

        return new PersonaDto(
            persona.Id.ToString(), persona.UserId, user?.Email, persona.Name ?? user?.Name,
            persona.Nickname, persona.Role.ToApiString(), persona.Role == BaulRole.SinAcceso ? "sin_acceso" : persona.IsClaimed ? "active" : "pending",
            persona.InvitedDate, persona.BaulId.ToString(), avatarUrl, canEdit, persona.Biografia,
            persona.AvatarPhotoId?.ToString(), persona.AvatarCropX, persona.AvatarCropY, persona.AvatarCropScale);
    }

    private async Task<string?> GetPersonaAvatarUrlAsync(Persona persona)
    {
        if (persona.AvatarPhotoId is { } photoId)
        {
            var photo = await photoRepository.GetByIdAsync(photoId);
            return photo is not null && photo.BaulId == persona.BaulId && photo.Status == PhotoStatus.Active
                ? await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PersonaAvatar)
                : null;
        }

        return persona.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar)
            : null;
    }
}
