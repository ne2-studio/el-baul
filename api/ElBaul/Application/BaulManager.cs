using CSharpFunctionalExtensions;
using Microsoft.Extensions.Logging;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class BaulManager(
    ILogger<BaulManager> logger,
    IBaulRepository baulRepository,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess) : IBaulManager
{
    // Recuerdo author names are always the Persona's apodo for this baúl, never the
    // underlying account's OIDC-synced name — duplicated from ChapterManager/PhotoManager,
    // same reasoning: a nickname is what the family chose, the account name may be unset.
    private async Task<(string Nickname, string? AvatarUrl, string? PersonaId)> GetAuthorInfoAsync(Guid baulId, string userId)
    {
        var persona = await baulRepository.GetPersonaByUserIdAsync(baulId, userId);
        var avatarUrl = persona?.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar)
            : null;
        return (persona?.Nickname ?? "Usuario", avatarUrl, persona?.Id.ToString());
    }

    public async Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync()
    {
        var userId = currentUserProvider.GetUserId();

        var owned = await baulRepository.GetOwnedByUserIdAsync(userId);
        var shared = await baulRepository.GetSharedByUserIdAsync(userId);
        var ownedList = owned.ToList();
        var sharedList = shared.ToList();

        var allBaulIds = ownedList.Select(b => b.Id).Concat(sharedList.Select(a => a.Baul.Id));
        var sharedCounts = await baulRepository.GetPersonaCountsAsync(allBaulIds);

        var dtos = new List<BaulDto>();
        foreach (var b in ownedList)
            dtos.Add(await ToDtoAsync(b, isCustodio: true, BaulRole.Custodio, sharedCounts.GetValueOrDefault(b.Id)));
        foreach (var a in sharedList)
            dtos.Add(await ToDtoAsync(a.Baul, isCustodio: false, a.Role, sharedCounts.GetValueOrDefault(a.Baul.Id)));

        return Result.Success<IEnumerable<BaulDto>>(dtos.OrderByDescending(d => d.UpdatedAt).ToList());
    }

    public async Task<Result<BaulDto>> CreateAsync(string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();
        var now = clock.UtcNow();

        var baul = new Baul(idGenerator.NewId(), name, description, userId, 0, now, now);
        await baulRepository.CreateAsync(baul);

        var user = await userRepository.GetByIdAsync(userId);
        var custodianPersona = new Persona(
            idGenerator.NewId(), baul.Id, userId, user?.Name ?? user?.Email ?? "Custodio",
            BaulRole.Custodio, now, Name: user?.Name);
        await baulRepository.AddPersonaAsync(custodianPersona);

        logger.LogInformation("Baul created {BaulId} {Name}", baul.Id, name);
        return await ToDtoAsync(baul, isCustodio: true, BaulRole.Custodio);
    }

    public async Task<Result<BaulDto>> GetByIdAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<BaulDto>("Baul not found");

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember) return Result.Failure<BaulDto>("Access denied");

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(baul, access.IsCustodio, access.Role, memberCount);
    }

    public async Task<Result<BaulDto>> SetCoverAsync(Guid baulId, Guid photoId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Baul cover update rejected: baul not found {BaulId}", baulId);
            return Result.Failure<BaulDto>("Baul not found");
        }
        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
        {
            logger.LogWarning("Baul cover update rejected: access denied {BaulId}", baulId);
            return Result.Failure<BaulDto>("Access denied");
        }

        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null || photo.BaulId != baulId)
        {
            logger.LogWarning("Baul cover update rejected: photo not found {BaulId} {PhotoId}", baulId, photoId);
            return Result.Failure<BaulDto>("Photo not found");
        }

        var updated = baul with { CoverPhotoKey = photo.StorageKey, UpdatedAt = clock.UtcNow() };
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul cover updated {BaulId} {PhotoId}", baulId, photoId);

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(updated, access.IsCustodio, access.Role, memberCount);
    }

    public async Task<Result<BaulDto>> UpdateAsync(Guid baulId, string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Baul update rejected: baul not found {BaulId}", baulId);
            return Result.Failure<BaulDto>("Baul not found");
        }
        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
        {
            logger.LogWarning("Baul update rejected: access denied {BaulId}", baulId);
            return Result.Failure<BaulDto>("Access denied");
        }

        var updated = baul with { Name = name, Description = description, UpdatedAt = clock.UtcNow() };
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul updated {BaulId} {Name}", baulId, name);

        var memberCount = (await baulRepository.GetPersonasAsync(baulId)).Count();
        return await ToDtoAsync(updated, access.IsCustodio, access.Role, memberCount);
    }

    public async Task<Result<BaulPreviewDto>> GetInvitePreviewAsync(Guid personaId)
    {
        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
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
        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
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
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<PersonaDto>>("Baul not found");

        var userId = currentUserProvider.GetUserId();
        var access = await baulAccess.GetAsync(baul, userId);

        var personas = await baulRepository.GetPersonasAsync(baulId);
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
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Persona detail rejected: baul not found {BaulId}", baulId);
            return Result.Failure<PersonaDto>("Baul not found");
        }

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
        {
            logger.LogWarning("Persona detail rejected: access denied {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>("Access denied");
        }

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
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
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Persona creation rejected: baul not found {BaulId}", baulId);
            return Result.Failure<PersonaDto>("Baul not found");
        }

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
        {
            logger.LogWarning("Persona creation rejected: access denied {BaulId}", baulId);
            return Result.Failure<PersonaDto>("Access denied");
        }

        var persona = new Persona(
            idGenerator.NewId(), baulId, null, nickname, BaulRole.Colaborador, clock.UtcNow());

        await baulRepository.AddPersonaAsync(persona);
        logger.LogInformation("Persona created {BaulId} {PersonaId} {Nickname}", baulId, persona.Id, nickname);
        return await ToPersonaDtoAsync(persona, null, canEdit: true);
    }

    public async Task<Result<PersonaDto>> UpdatePersonaAsync(Guid baulId, Guid personaId, string? name, string nickname)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Persona update rejected: baul not found {BaulId}", baulId);
            return Result.Failure<PersonaDto>("Baul not found");
        }

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning("Persona update rejected: persona not found {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>("Persona not found");
        }

        var access = await baulAccess.GetAsync(baul, userId);
        var canEdit = CanEditPersona(persona, userId, access);
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
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Persona avatar update rejected: baul not found {BaulId}", baulId);
            return Result.Failure<PersonaDto>("Baul not found");
        }

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
        if (persona is null || persona.BaulId != baulId)
        {
            logger.LogWarning(
                "Persona avatar update rejected: persona not found {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>("Persona not found");
        }

        var access = await baulAccess.GetAsync(baul, userId);
        var canEdit = CanEditPersona(persona, userId, access);
        if (!canEdit)
        {
            logger.LogWarning(
                "Persona avatar update rejected: access denied {BaulId} {PersonaId}", baulId, personaId);
            return Result.Failure<PersonaDto>("Access denied");
        }

        var storageKey = $"personas/{personaId}/{idGenerator.NewId()}-{fileName}";
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
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Persona role update rejected: baul not found {BaulId}", baulId);
            return Result.Failure<PersonaDto>("Baul not found");
        }
        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
        {
            logger.LogWarning("Persona role update rejected: access denied {BaulId}", baulId);
            return Result.Failure<PersonaDto>("Access denied");
        }

        if (!DtoMapping.TryParseBaulRole(role, out var parsedRole))
        {
            logger.LogWarning("Persona role update rejected: invalid role {BaulId} {Role}", baulId, role);
            return Result.Failure<PersonaDto>("Invalid role");
        }

        var persona = await baulRepository.GetPersonaByIdAsync(personaId);
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
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Persona removal rejected: baul not found {BaulId}", baulId);
            return Result.Failure("Baul not found");
        }
        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
        {
            logger.LogWarning("Persona removal rejected: access denied {BaulId}", baulId);
            return Result.Failure("Access denied");
        }

        await baulRepository.RemovePersonaAsync(baulId, personaId);
        logger.LogInformation("Persona removed {BaulId} {PersonaId}", baulId, personaId);
        return Result.Success();
    }

    public async Task<Result<IEnumerable<RemovalRequestDto>>> GetRemovalRequestsAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<RemovalRequestDto>>("Baul not found");
        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
            return Result.Failure<IEnumerable<RemovalRequestDto>>("Access denied");

        var requests = await baulRepository.GetRemovalRequestsAsync(baulId);
        var dtos = new List<RemovalRequestDto>();
        foreach (var request in requests)
        {
            var url = await photoStorage.GetImageUrl(request.PhotoStorageKey, ImagePlacement.RemovalRequestThumbnail);
            dtos.Add(ToDto(request, url));
        }

        return Result.Success<IEnumerable<RemovalRequestDto>>(dtos);
    }

    public async Task<Result<RemovalRequestDto>> CreateRemovalRequestAsync(Guid baulId, Guid photoId, string? reason)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Removal request creation rejected: baul not found {BaulId}", baulId);
            return Result.Failure<RemovalRequestDto>("Baul not found");
        }

        var userId = currentUserProvider.GetUserId();
        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
        {
            logger.LogWarning("Removal request creation rejected: access denied {BaulId}", baulId);
            return Result.Failure<RemovalRequestDto>("Access denied");
        }

        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning(
                "Removal request creation rejected: photo not found {BaulId} {PhotoId}", baulId, photoId);
            return Result.Failure<RemovalRequestDto>("Photo not found");
        }

        var nickname = access.Persona?.Nickname ?? "Usuario";
        var userProfile = await userRepository.GetByIdAsync(userId);
        var now = clock.UtcNow();
        var request = new RemovalRequest(
            idGenerator.NewId(), baulId, photoId, photo.StorageKey,
            nickname, userProfile?.Email ?? "", reason, now, RequestStatus.Pending);

        await baulRepository.CreateRemovalRequestAsync(request);
        logger.LogInformation(
            "Removal request created {BaulId} {PhotoId} {RemovalRequestId}", baulId, photoId, request.Id);

        var url = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.RemovalRequestThumbnail);
        return ToDto(request, url);
    }

    public async Task<Result> ApproveRemovalRequestAsync(Guid baulId, Guid requestId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Removal request approval rejected: baul not found {BaulId}", baulId);
            return Result.Failure("Baul not found");
        }
        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
        {
            logger.LogWarning("Removal request approval rejected: access denied {BaulId}", baulId);
            return Result.Failure("Access denied");
        }

        var request = await baulRepository.GetRemovalRequestAsync(baulId, requestId);
        if (request is null)
        {
            logger.LogWarning(
                "Removal request approval rejected: request not found {BaulId} {RemovalRequestId}",
                baulId, requestId);
            return Result.Failure("Request not found");
        }

        var photo = await photoRepository.GetByIdAsync(request.PhotoId);
        if (photo?.ChapterId is { } photoChapterId)
        {
            var chapter = await chapterRepository.GetByIdAsync(photoChapterId);
            if (chapter is not null)
            {
                await chapterRepository.UpdateAsync(chapter with { PhotoCount = Math.Max(0, chapter.PhotoCount - 1) });
            }
        }

        await photoRepository.DeleteAsync(request.PhotoId);
        await baulRepository.DeleteRemovalRequestAsync(baulId, requestId);

        if (photo is not null)
        {
            await photoStorage.DeleteAsync(photo.StorageKey);
        }

        logger.LogInformation(
            "Removal request approved, photo deleted {BaulId} {PhotoId} {RemovalRequestId} {ChapterId}",
            baulId, request.PhotoId, requestId, photo?.ChapterId);

        return Result.Success();
    }

    public async Task<Result> RejectRemovalRequestAsync(Guid baulId, Guid requestId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Reject removal request failed: baul not found {BaulId}", baulId);
            return Result.Failure("Baul not found");
        }
        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsAdmin)
        {
            logger.LogWarning("Reject removal request failed: access denied {BaulId}", baulId);
            return Result.Failure("Access denied");
        }

        await baulRepository.DeleteRemovalRequestAsync(baulId, requestId);
        logger.LogInformation("Removal request rejected {BaulId} {RemovalRequestId}", baulId, requestId);
        return Result.Success();
    }

    private async Task<BaulDto> ToDtoAsync(Baul baul, bool isCustodio, BaulRole role, int memberCount = 1)
    {
        var coverUrl = baul.CoverPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(baul.CoverPhotoKey, ImagePlacement.BaulCover)
            : null;

        return new BaulDto(baul.Id.ToString(), baul.Name, baul.Description, baul.ChapterCount, coverUrl,
            baul.CreatedAt, baul.UpdatedAt, isCustodio, role.ToApiString(), memberCount);
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

    private static RemovalRequestDto ToDto(RemovalRequest request, string photoUrl) =>
        new(request.Id.ToString(), request.PhotoId.ToString(), photoUrl,
            request.RequesterName, request.RequesterEmail, request.Reason, request.RequestDate,
            request.Status.ToApiString(), request.BaulId.ToString());

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Baul not found");

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember) return Result.Failure<IEnumerable<RecuerdoDto>>("Access denied");

        var recuerdos = (await recuerdoRepository.GetByBaulIdAsync(baulId)).ToList();

        var chapterNames = (await chapterRepository.GetByBaulIdAsync(baulId)).ToDictionary(a => a.Id, a => a.Name);

        var photoIds = recuerdos.Where(r => r.PhotoId is not null).Select(r => r.PhotoId!.Value).Distinct().ToList();
        var thumbnailUrls = new Dictionary<Guid, string>();
        foreach (var photoId in photoIds)
        {
            var photo = await photoRepository.GetByIdAsync(photoId);
            if (photo is not null)
                thumbnailUrls[photoId] = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PhotoGridThumbnail);
        }

        var dtos = new List<RecuerdoDto>();
        foreach (var recuerdo in recuerdos)
        {
            var (nickname, avatarUrl, personaId) = await GetAuthorInfoAsync(baulId, recuerdo.UserId);
            var thumbnailUrl = recuerdo.PhotoId is { } photoId ? thumbnailUrls.GetValueOrDefault(photoId) : null;
            var chapterName = recuerdo.ChapterId is { } chapterId ? chapterNames.GetValueOrDefault(chapterId) : null;
            dtos.Add(ToRecuerdoDto(recuerdo, nickname, avatarUrl, personaId, recuerdo.UserId == userId, thumbnailUrl, chapterName));
        }

        return Result.Success<IEnumerable<RecuerdoDto>>(dtos);
    }

    public async Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid baulId, string text)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Recuerdo creation rejected: baul not found {BaulId}", baulId);
            return Result.Failure<RecuerdoDto>("Baul not found");
        }

        var access = await baulAccess.GetAsync(baul, userId);
        if (!access.IsMember)
        {
            logger.LogWarning("Recuerdo creation rejected: access denied {BaulId}", baulId);
            return Result.Failure<RecuerdoDto>("Access denied");
        }

        var (nickname, avatarUrl, personaId) = await GetAuthorInfoAsync(baulId, userId);
        var recuerdo = new Recuerdo(idGenerator.NewId(), null, null, baulId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation("Recuerdo created {BaulId} {RecuerdoId}", baulId, recuerdo.Id);

        return ToRecuerdoDto(recuerdo, nickname, avatarUrl, personaId, isOwn: true, photoThumbnailUrl: null, chapterName: null);
    }

    private static RecuerdoDto ToRecuerdoDto(
        Recuerdo recuerdo, string userName, string? userAvatar, string? personaId, bool isOwn, string? photoThumbnailUrl,
        string? chapterName) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId?.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn, photoThumbnailUrl, userAvatar, personaId, recuerdo.ChapterId?.ToString(), chapterName);
}
