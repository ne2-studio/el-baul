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
    IPhotoPersonaTagRepository photoPersonaTagRepository) : IPersonaManager
{
    public async Task<Result<BaulPreviewDto>> GetInvitePreviewAsync(PersonaId personaId)
    {
        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.IsClaimed)
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

        var canEdit = CanEditPersona(persona, userId, auth.Value);
        if (!canEdit)
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
        BaulId baulId, PersonaId personaId, Stream content, string fileName, string contentType)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            baulId, userId, AccessLevel.Member, "Persona avatar update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning(
                "Persona avatar update rejected: persona not found {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>(ApplicationError.NotFound("Persona not found"));
        }

        var canEdit = CanEditPersona(persona, userId, auth.Value);
        if (!canEdit)
        {
            logger.LogWarning(
                "Persona avatar update rejected: access denied {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>(ApplicationError.Forbidden("Access denied"));
        }

        var storageKey = StorageKey.ForPersonaAvatar(personaId, idGenerator.NewId(), fileName);
        await photoStorage.SaveAsync(storageKey, content, contentType);

        var previousKey = persona.AvatarPhotoKey;
        var updated = persona with { AvatarPhotoKey = storageKey };
        await baulRepository.UpdatePersonaAsync(updated);
        logger.LogInformation(
            "Persona avatar updated {BaulId} {PersonaId} {StorageKey}", baulId, personaId, storageKey);

        if (!string.IsNullOrEmpty(previousKey))
        {
            try
            {
                await photoStorage.DeleteAsync(previousKey);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to clean up orphaned persona avatar {StorageKey}", previousKey);
            }
        }

        var user = updated.IsClaimed ? await userRepository.GetByIdAsync(updated.UserId!) : null;
        return await ToPersonaDtoAsync(updated, user, canEdit);
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

        // Must run before the persona row is removed: PhotoPersonaTag's FK to Persona is
        // Restrict (see PhotoPersonaTagConfiguration), so a real Postgres delete would
        // otherwise fail with any tags still pointing at this persona.
        await photoPersonaTagRepository.DeleteByPersonaIdAsync(personaId);
        await baulRepository.RemovePersonaAsync(baulId, personaId);
        logger.LogInformation("Persona removed {BaulId} {PersonaId}", baulId, personaId);
        return Result.Success();
    }

    private static bool CanEditPersona(Persona target, string callerUserId, BaulAccess callerAccess) =>
        callerAccess.IsAdmin || (target.IsClaimed && target.UserId == callerUserId);

    private async Task<PersonaDto> ToPersonaDtoAsync(Persona persona, User? user, bool canEdit)
    {
        var avatarUrl = persona.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar)
            : null;

        return new PersonaDto(
            persona.Id.ToString(), persona.UserId, user?.Email, persona.Name ?? user?.Name,
            persona.Nickname, persona.Role.ToApiString(), persona.IsClaimed ? "active" : "pending",
            persona.InvitedDate, persona.BaulId.ToString(), avatarUrl, canEdit, persona.Biografia);
    }
}
