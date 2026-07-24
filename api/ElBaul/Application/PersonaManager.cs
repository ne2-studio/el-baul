using CSharpFunctionalExtensions;
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
    BaulAccessService baulAccess) : IPersonaManager
{
    public async Task<Result<BaulPreviewDto>> GetInvitePreviewAsync(Guid personaId)
    {
        var id = new PersonaId(personaId);
        var persona = await baulRepository.GetPersonaByIdAsync(id);
        if (persona is null || persona.UserId is not null)
            return Result.Failure<BaulPreviewDto>("Invitation not found");

        var baul = await baulRepository.GetByIdAsync(persona.BaulId);
        if (baul is null) return Result.Failure<BaulPreviewDto>("Baul not found");

        var photos = await photoRepository.GetPreviewPhotosAsync(baul.Id, 4);
        var urls = new List<string>();
        foreach (var photo in photos)
        {
            urls.Add(await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.InvitationPreview));
        }

        return new BaulPreviewDto(baul.Id.ToString(), baul.Name, baul.Description, persona.Nickname, urls);
    }

    public async Task<Result<PersonaDto>> AcceptPersonalInviteAsync(Guid personaId)
    {
        var id = new PersonaId(personaId);
        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        var persona = await baulRepository.GetPersonaByIdAsync(id);
        if (persona is null)
        {
            logger.LogWarning("Personal invitation acceptance rejected: persona not found {PersonaId}", personaId);
            return Result.Failure<PersonaDto>("Invitation not found");
        }

        if (persona.UserId is not null && persona.UserId != userId)
        {
            logger.LogWarning("Personal invitation acceptance rejected: already claimed {PersonaId}", personaId);
            return Result.Failure<PersonaDto>("This invitation has already been used");
        }

        if (persona.UserId is null)
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
                return Result.Failure<PersonaDto>("You already have access to this baúl with a different account link");
            }

            persona = persona with { UserId = userId, Name = persona.Name ?? user?.Name };
            await baulRepository.UpdatePersonaAsync(persona);
            logger.LogInformation("Personal invitation accepted {PersonaId} {BaulId}", personaId, persona.BaulId);
        }

        return await ToPersonaDtoAsync(persona, user, canEdit: true);
    }

    public async Task<Result<IEnumerable<PersonaDto>>> GetPersonasAsync(Guid baulId)
    {
        var id = new BaulId(baulId);
        var baul = await baulRepository.GetByIdAsync(id);
        if (baul is null) return Result.Failure<IEnumerable<PersonaDto>>("Baul not found");

        var userId = currentUserProvider.GetUserId();
        var access = await baulAccess.GetAsync(baul, userId);

        var personas = await baulRepository.GetPersonasAsync(id);
        var dtos = new List<PersonaDto>();

        foreach (var persona in personas)
        {
            var user = persona.UserId is not null ? await userRepository.GetByIdAsync(persona.UserId) : null;
            var canEdit = CanEditPersona(persona, userId, access);
            dtos.Add(await ToPersonaDtoAsync(persona, user, canEdit));
        }

        return Result.Success<IEnumerable<PersonaDto>>(dtos);
    }

    public async Task<Result<PersonaDto>> GetPersonaAsync(Guid baulId, Guid personaId)
    {
        var bId = new BaulId(baulId);
        var pId = new PersonaId(personaId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            bId, userId, AccessLevel.Member, "Persona detail", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);
        var access = auth.Value;

        var persona = await baulRepository.GetPersonaByIdAsync(pId);
        if (persona is null || persona.BaulId != bId)
        {
            logger.LogWarning("Persona detail rejected: persona not found {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>("Persona not found");
        }

        var canEdit = CanEditPersona(persona, userId, access);
        var user = persona.UserId is not null ? await userRepository.GetByIdAsync(persona.UserId) : null;
        return await ToPersonaDtoAsync(persona, user, canEdit);
    }

    public async Task<Result<PersonaDto>> CreatePersonaAsync(Guid baulId, string nickname)
    {
        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(id, userId, AccessLevel.Admin, "Persona creation", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = new Persona(
            new PersonaId(idGenerator.NewId()), id, null, nickname, BaulRole.Colaborador, clock.UtcNow());

        await baulRepository.AddPersonaAsync(persona);
        logger.LogInformation("Persona created {BaulId} {PersonaId} {Nickname}", baulId, persona.Id, nickname);
        return await ToPersonaDtoAsync(persona, null, canEdit: true);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaAsync(Guid baulId, Guid personaId, string? name, string nickname)
    {
        var bId = new BaulId(baulId);
        var pId = new PersonaId(personaId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            bId, userId, AccessLevel.Member, "Persona update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(pId);
        if (persona is null || persona.BaulId != bId)
        {
            logger.LogWarning("Persona update rejected: persona not found {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>("Persona not found");
        }

        var canEdit = CanEditPersona(persona, userId, auth.Value);
        if (!canEdit)
        {
            logger.LogWarning("Persona update rejected: access denied {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>("Access denied");
        }

        var updated = persona with { Name = name, Nickname = nickname };
        await baulRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona updated {BaulId} {PersonaId}", baulId, personaId);

        var user = updated.UserId is not null ? await userRepository.GetByIdAsync(updated.UserId) : null;
        return await ToPersonaDtoAsync(updated, user, canEdit);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaAvatarAsync(
        Guid baulId, Guid personaId, Stream content, string fileName, string contentType)
    {
        var bId = new BaulId(baulId);
        var pId = new PersonaId(personaId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(
            bId, userId, AccessLevel.Member, "Persona avatar update", new { BaulId = baulId, PersonaId = personaId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        var persona = await baulRepository.GetPersonaByIdAsync(pId);
        if (persona is null || persona.BaulId != bId)
        {
            logger.LogWarning(
                "Persona avatar update rejected: persona not found {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>("Persona not found");
        }

        var canEdit = CanEditPersona(persona, userId, auth.Value);
        if (!canEdit)
        {
            logger.LogWarning(
                "Persona avatar update rejected: access denied {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>("Access denied");
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

        var user = updated.UserId is not null ? await userRepository.GetByIdAsync(updated.UserId) : null;
        return await ToPersonaDtoAsync(updated, user, canEdit);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaRoleAsync(Guid baulId, Guid personaId, string role)
    {
        var bId = new BaulId(baulId);
        var pId = new PersonaId(personaId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(bId, userId, AccessLevel.Admin, "Persona role update", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<PersonaDto>(auth.Error);

        if (!DtoMapping.TryParseBaulRole(role, out var parsedRole))
        {
            logger.LogWarning("Persona role update rejected: invalid role {BaulId} {Role}", baulId, role);
            return Result.Failure<PersonaDto>("Invalid role");
        }

        var persona = await baulRepository.GetPersonaByIdAsync(pId);
        if (persona is null)
        {
            logger.LogWarning(
                "Persona role update rejected: persona not found {BaulId} {PersonaId}",
                baulId, personaId);
            return Result.Failure<PersonaDto>("Persona not found");
        }

        var updated = persona with { Role = parsedRole };
        await baulRepository.UpdatePersonaAsync(updated);
        logger.LogInformation("Persona role updated {BaulId} {PersonaId} {Role}", baulId, personaId, parsedRole);

        var user = updated.UserId is not null ? await userRepository.GetByIdAsync(updated.UserId) : null;
        return await ToPersonaDtoAsync(updated, user, canEdit: true);
    }

    public async Task<Result> RemovePersonaAsync(Guid baulId, Guid personaId)
    {
        var bId = new BaulId(baulId);
        var pId = new PersonaId(personaId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(bId, userId, AccessLevel.Admin, "Persona removal", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        await baulRepository.RemovePersonaAsync(bId, pId);
        logger.LogInformation("Persona removed {BaulId} {PersonaId}", baulId, personaId);
        return Result.Success();
    }

    private static bool CanEditPersona(Persona target, string callerUserId, BaulAccess callerAccess) =>
        callerAccess.IsAdmin || (target.UserId is not null && target.UserId == callerUserId);

    private async Task<PersonaDto> ToPersonaDtoAsync(Persona persona, User? user, bool canEdit)
    {
        var avatarUrl = persona.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar)
            : null;

        return new PersonaDto(
            persona.Id.ToString(), persona.UserId, user?.Email, persona.Name ?? user?.Name,
            persona.Nickname, persona.Role.ToApiString(), persona.UserId is not null ? "active" : "pending",
            persona.InvitedDate, persona.BaulId.ToString(), avatarUrl, canEdit);
    }
}
