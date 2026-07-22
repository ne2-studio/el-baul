using CSharpFunctionalExtensions;
using Microsoft.Extensions.Logging;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class BaulManager(
    ILogger<BaulManager> logger,
    IBaulRepository baulRepository,
    IAlbumRepository albumRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider) : IBaulManager
{
    // Recuerdo author names are always the Persona's apodo for this baúl, never the
    // underlying account's OIDC-synced name — duplicated from AlbumManager/PhotoManager,
    // same reasoning: a nickname is what the family chose, the account name may be unset.
    private async Task<(string Nickname, string? AvatarUrl, string? SharedUserId)> GetAuthorInfoAsync(Guid baulId, string userId)
    {
        var sharedUser = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        var avatarUrl = sharedUser?.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(sharedUser.AvatarPhotoKey, ImagePlacement.PersonaAvatar)
            : null;
        return (sharedUser?.Nickname ?? "Usuario", avatarUrl, sharedUser?.Id.ToString());
    }

    public async Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync()
    {
        var userId = currentUserProvider.GetUserId();

        var owned = await baulRepository.GetOwnedByUserIdAsync(userId);
        var shared = await baulRepository.GetSharedByUserIdAsync(userId);
        var ownedList = owned.ToList();
        var sharedList = shared.ToList();

        var allBaulIds = ownedList.Select(b => b.Id).Concat(sharedList.Select(a => a.Baul.Id));
        var sharedCounts = await baulRepository.GetSharedUserCountsAsync(allBaulIds);

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
        var custodianSharedUser = new SharedUser(
            idGenerator.NewId(), baul.Id, userId, user?.Name ?? user?.Email ?? "Custodio",
            BaulRole.Custodio, now, Name: user?.Name);
        await baulRepository.AddSharedUserAsync(custodianSharedUser);

        logger.LogInformation("Baul created {BaulId} {Name}", baul.Id, name);
        return await ToDtoAsync(baul, isCustodio: true, BaulRole.Custodio);
    }

    public async Task<Result<BaulDto>> GetByIdAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<BaulDto>("Baul not found");

        var isCustodio = baul.CustodioId == userId;
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);

        if (!isCustodio && sharedAccess is null) return Result.Failure<BaulDto>("Access denied");

        var role = isCustodio ? BaulRole.Custodio : sharedAccess!.Role;
        var memberCount = (await baulRepository.GetSharedUsersAsync(baulId)).Count();
        return await ToDtoAsync(baul, isCustodio, role, memberCount);
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
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (sharedAccess is null || !sharedAccess.Role.IsAdmin())
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

        var memberCount = (await baulRepository.GetSharedUsersAsync(baulId)).Count();
        return await ToDtoAsync(updated, baul.CustodioId == userId, sharedAccess.Role, memberCount);
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
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (sharedAccess is null || !sharedAccess.Role.IsAdmin())
        {
            logger.LogWarning("Baul update rejected: access denied {BaulId}", baulId);
            return Result.Failure<BaulDto>("Access denied");
        }

        var updated = baul with { Name = name, Description = description, UpdatedAt = clock.UtcNow() };
        await baulRepository.UpdateAsync(updated);

        logger.LogInformation("Baul updated {BaulId} {Name}", baulId, name);

        var memberCount = (await baulRepository.GetSharedUsersAsync(baulId)).Count();
        return await ToDtoAsync(updated, baul.CustodioId == userId, sharedAccess.Role, memberCount);
    }

    public async Task<Result<BaulPreviewDto>> GetInvitePreviewAsync(Guid sharedUserId)
    {
        var sharedUser = await baulRepository.GetSharedUserByIdAsync(sharedUserId);
        if (sharedUser is null || sharedUser.UserId is not null)
            return Result.Failure<BaulPreviewDto>("Invitation not found");

        var baul = await baulRepository.GetByIdAsync(sharedUser.BaulId);
        if (baul is null) return Result.Failure<BaulPreviewDto>("Baul not found");

        var photos = await photoRepository.GetPreviewPhotosAsync(baul.Id, 4);
        var urls = new List<string>();
        foreach (var photo in photos)
        {
            urls.Add(await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.InvitationPreview));
        }

        return new BaulPreviewDto(baul.Id.ToString(), baul.Name, baul.Description, sharedUser.Nickname, urls);
    }

    public async Task<Result<SharedUserDto>> AcceptPersonalInviteAsync(Guid sharedUserId)
    {
        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        var sharedUser = await baulRepository.GetSharedUserByIdAsync(sharedUserId);
        if (sharedUser is null)
        {
            logger.LogWarning("Personal invitation acceptance rejected: shared user not found {SharedUserId}", sharedUserId);
            return Result.Failure<SharedUserDto>("Invitation not found");
        }

        if (sharedUser.UserId is not null && sharedUser.UserId != userId)
        {
            logger.LogWarning("Personal invitation acceptance rejected: already claimed {SharedUserId}", sharedUserId);
            return Result.Failure<SharedUserDto>("This invitation has already been used");
        }

        if (sharedUser.UserId is null)
        {
            // The caller may already belong to this baúl under a different SharedUser row
            // (e.g. they're its custodio, or already claimed another Persona here) — the
            // (BaulId, UserId) unique index would reject that at the DB level, so check first
            // and fail cleanly instead of surfacing a raw constraint-violation error.
            var existingMembership = await baulRepository.GetSharedUserByUserIdAsync(sharedUser.BaulId, userId);
            if (existingMembership is not null)
            {
                logger.LogWarning(
                    "Personal invitation acceptance rejected: caller already has access to this baul {SharedUserId} {BaulId}",
                    sharedUserId, sharedUser.BaulId);
                return Result.Failure<SharedUserDto>("You already have access to this baúl with a different account link");
            }

            sharedUser = sharedUser with { UserId = userId, Name = sharedUser.Name ?? user?.Name };
            await baulRepository.UpdateSharedUserAsync(sharedUser);
            logger.LogInformation("Personal invitation accepted {SharedUserId} {BaulId}", sharedUserId, sharedUser.BaulId);
        }

        return await ToPersonaDtoAsync(sharedUser, user, canEdit: true);
    }

    public async Task<Result<IEnumerable<SharedUserDto>>> GetSharedUsersAsync(Guid baulId)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<SharedUserDto>>("Baul not found");

        var userId = currentUserProvider.GetUserId();
        var isCustodio = baul.CustodioId == userId;
        var callerAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);

        var sharedUsers = await baulRepository.GetSharedUsersAsync(baulId);
        var dtos = new List<SharedUserDto>();

        foreach (var sharedUser in sharedUsers)
        {
            var user = sharedUser.UserId is not null ? await userRepository.GetByIdAsync(sharedUser.UserId) : null;
            var canEdit = CanEditPersona(sharedUser, userId, isCustodio, callerAccess);
            dtos.Add(await ToPersonaDtoAsync(sharedUser, user, canEdit));
        }

        return Result.Success<IEnumerable<SharedUserDto>>(dtos);
    }

    public async Task<Result<SharedUserDto>> GetPersonaAsync(Guid baulId, Guid sharedUserId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Persona detail rejected: baul not found {BaulId}", baulId);
            return Result.Failure<SharedUserDto>("Baul not found");
        }

        var isCustodio = baul.CustodioId == userId;
        var callerAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (!isCustodio && callerAccess is null)
        {
            logger.LogWarning("Persona detail rejected: access denied {BaulId} {SharedUserId}", baulId, sharedUserId);
            return Result.Failure<SharedUserDto>("Access denied");
        }

        var sharedUser = await baulRepository.GetSharedUserByIdAsync(sharedUserId);
        if (sharedUser is null || sharedUser.BaulId != baulId)
        {
            logger.LogWarning("Persona detail rejected: persona not found {BaulId} {SharedUserId}", baulId, sharedUserId);
            return Result.Failure<SharedUserDto>("Persona not found");
        }

        var canEdit = CanEditPersona(sharedUser, userId, isCustodio, callerAccess);
        var user = sharedUser.UserId is not null ? await userRepository.GetByIdAsync(sharedUser.UserId) : null;
        return await ToPersonaDtoAsync(sharedUser, user, canEdit);
    }

    public async Task<Result<SharedUserDto>> CreatePersonaAsync(Guid baulId, string nickname)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Persona creation rejected: baul not found {BaulId}", baulId);
            return Result.Failure<SharedUserDto>("Baul not found");
        }

        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (sharedAccess is null || !sharedAccess.Role.IsAdmin())
        {
            logger.LogWarning("Persona creation rejected: access denied {BaulId}", baulId);
            return Result.Failure<SharedUserDto>("Access denied");
        }

        var persona = new SharedUser(
            idGenerator.NewId(), baulId, null, nickname, BaulRole.Colaborador, clock.UtcNow());

        await baulRepository.AddSharedUserAsync(persona);
        logger.LogInformation("Persona created {BaulId} {SharedUserId} {Nickname}", baulId, persona.Id, nickname);
        return await ToPersonaDtoAsync(persona, null, canEdit: true);
    }

    public async Task<Result<SharedUserDto>> UpdatePersonaAsync(Guid baulId, Guid sharedUserId, string? name, string nickname)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Persona update rejected: baul not found {BaulId}", baulId);
            return Result.Failure<SharedUserDto>("Baul not found");
        }

        var sharedUser = await baulRepository.GetSharedUserByIdAsync(sharedUserId);
        if (sharedUser is null || sharedUser.BaulId != baulId)
        {
            logger.LogWarning("Persona update rejected: persona not found {BaulId} {SharedUserId}", baulId, sharedUserId);
            return Result.Failure<SharedUserDto>("Persona not found");
        }

        var isCustodio = baul.CustodioId == userId;
        var callerAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        var canEdit = CanEditPersona(sharedUser, userId, isCustodio, callerAccess);
        if (!canEdit)
        {
            logger.LogWarning("Persona update rejected: access denied {BaulId} {SharedUserId}", baulId, sharedUserId);
            return Result.Failure<SharedUserDto>("Access denied");
        }

        var updated = sharedUser with { Name = name, Nickname = nickname };
        await baulRepository.UpdateSharedUserAsync(updated);
        logger.LogInformation("Persona updated {BaulId} {SharedUserId}", baulId, sharedUserId);

        var user = updated.UserId is not null ? await userRepository.GetByIdAsync(updated.UserId) : null;
        return await ToPersonaDtoAsync(updated, user, canEdit);
    }

    public async Task<Result<SharedUserDto>> UpdatePersonaAvatarAsync(
        Guid baulId, Guid sharedUserId, Stream content, string fileName, string contentType)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Persona avatar update rejected: baul not found {BaulId}", baulId);
            return Result.Failure<SharedUserDto>("Baul not found");
        }

        var sharedUser = await baulRepository.GetSharedUserByIdAsync(sharedUserId);
        if (sharedUser is null || sharedUser.BaulId != baulId)
        {
            logger.LogWarning(
                "Persona avatar update rejected: persona not found {BaulId} {SharedUserId}", baulId, sharedUserId);
            return Result.Failure<SharedUserDto>("Persona not found");
        }

        var isCustodio = baul.CustodioId == userId;
        var callerAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        var canEdit = CanEditPersona(sharedUser, userId, isCustodio, callerAccess);
        if (!canEdit)
        {
            logger.LogWarning(
                "Persona avatar update rejected: access denied {BaulId} {SharedUserId}", baulId, sharedUserId);
            return Result.Failure<SharedUserDto>("Access denied");
        }

        var storageKey = $"personas/{sharedUserId}/{idGenerator.NewId()}-{fileName}";
        await photoStorage.SaveAsync(storageKey, content, contentType);

        var previousKey = sharedUser.AvatarPhotoKey;
        var updated = sharedUser with { AvatarPhotoKey = storageKey };
        await baulRepository.UpdateSharedUserAsync(updated);
        logger.LogInformation(
            "Persona avatar updated {BaulId} {SharedUserId} {StorageKey}", baulId, sharedUserId, storageKey);

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

    public async Task<Result<SharedUserDto>> UpdateSharedUserRoleAsync(Guid baulId, Guid sharedUserId, string role)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Shared user role update rejected: baul not found {BaulId}", baulId);
            return Result.Failure<SharedUserDto>("Baul not found");
        }
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (sharedAccess is null || !sharedAccess.Role.IsAdmin())
        {
            logger.LogWarning("Shared user role update rejected: access denied {BaulId}", baulId);
            return Result.Failure<SharedUserDto>("Access denied");
        }

        if (!DtoMapping.TryParseBaulRole(role, out var parsedRole))
        {
            logger.LogWarning("Shared user role update rejected: invalid role {BaulId} {Role}", baulId, role);
            return Result.Failure<SharedUserDto>("Invalid role");
        }

        var sharedUser = await baulRepository.GetSharedUserByIdAsync(sharedUserId);
        if (sharedUser is null)
        {
            logger.LogWarning(
                "Shared user role update rejected: shared user not found {BaulId} {SharedUserId}",
                baulId, sharedUserId);
            return Result.Failure<SharedUserDto>("Shared user not found");
        }

        var updated = sharedUser with { Role = parsedRole };
        await baulRepository.UpdateSharedUserAsync(updated);
        logger.LogInformation("Shared user role updated {BaulId} {SharedUserId} {Role}", baulId, sharedUserId, parsedRole);

        var user = updated.UserId is not null ? await userRepository.GetByIdAsync(updated.UserId) : null;
        return await ToPersonaDtoAsync(updated, user, canEdit: true);
    }

    public async Task<Result> RemoveSharedUserAsync(Guid baulId, Guid sharedUserId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Shared user removal rejected: baul not found {BaulId}", baulId);
            return Result.Failure("Baul not found");
        }
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (sharedAccess is null || !sharedAccess.Role.IsAdmin())
        {
            logger.LogWarning("Shared user removal rejected: access denied {BaulId}", baulId);
            return Result.Failure("Access denied");
        }

        await baulRepository.RemoveSharedUserAsync(baulId, sharedUserId);
        logger.LogInformation("Shared user removed {BaulId} {SharedUserId}", baulId, sharedUserId);
        return Result.Success();
    }

    public async Task<Result<IEnumerable<RemovalRequestDto>>> GetRemovalRequestsAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<RemovalRequestDto>>("Baul not found");
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (sharedAccess is null || !sharedAccess.Role.IsAdmin())
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

        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null)
        {
            logger.LogWarning(
                "Removal request creation rejected: photo not found {BaulId} {PhotoId}", baulId, photoId);
            return Result.Failure<RemovalRequestDto>("Photo not found");
        }

        var userId = currentUserProvider.GetUserId();
        var nickname = (await baulRepository.GetSharedUserByUserIdAsync(baulId, userId))?.Nickname ?? "Usuario";
        var userProfile = await userRepository.GetByIdAsync(userId);
        var now = clock.UtcNow();
        var request = new RemovalRequest(
            idGenerator.NewId(), baulId, photoId, photo.StorageKey, photo.Caption,
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
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (sharedAccess is null || !sharedAccess.Role.IsAdmin())
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
        if (photo?.AlbumId is { } photoAlbumId)
        {
            var album = await albumRepository.GetByIdAsync(photoAlbumId);
            if (album is not null)
            {
                await albumRepository.UpdateAsync(album with { PhotoCount = Math.Max(0, album.PhotoCount - 1) });
            }
        }

        await photoRepository.DeleteAsync(request.PhotoId);
        await baulRepository.DeleteRemovalRequestAsync(baulId, requestId);

        if (photo is not null)
        {
            await photoStorage.DeleteAsync(photo.StorageKey);
        }

        logger.LogInformation(
            "Removal request approved, photo deleted {BaulId} {PhotoId} {RemovalRequestId} {AlbumId}",
            baulId, request.PhotoId, requestId, photo?.AlbumId);

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
        var sharedAccess = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (sharedAccess is null || !sharedAccess.Role.IsAdmin())
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

        return new BaulDto(baul.Id.ToString(), baul.Name, baul.Description, baul.AlbumCount, coverUrl,
            baul.CreatedAt, baul.UpdatedAt, isCustodio, role.ToApiString(), memberCount);
    }

    private static bool CanEditPersona(SharedUser target, string callerUserId, bool callerIsCustodio, SharedUser? callerAccess) =>
        callerIsCustodio
        || (callerAccess is not null && callerAccess.Role.IsAdmin())
        || (target.UserId is not null && target.UserId == callerUserId);

    private async Task<SharedUserDto> ToPersonaDtoAsync(SharedUser sharedUser, User? user, bool canEdit)
    {
        var avatarUrl = sharedUser.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(sharedUser.AvatarPhotoKey, ImagePlacement.PersonaAvatar)
            : null;

        return new SharedUserDto(
            sharedUser.Id.ToString(), sharedUser.UserId, user?.Email, sharedUser.Name ?? user?.Name,
            sharedUser.Nickname, sharedUser.Role.ToApiString(), sharedUser.UserId is not null ? "active" : "pending",
            sharedUser.InvitedDate, sharedUser.BaulId.ToString(), avatarUrl, canEdit);
    }

    private static RemovalRequestDto ToDto(RemovalRequest request, string photoUrl) =>
        new(request.Id.ToString(), request.PhotoId.ToString(), photoUrl, request.PhotoCaption,
            request.RequesterName, request.RequesterEmail, request.Reason, request.RequestDate,
            request.Status.ToApiString(), request.BaulId.ToString());

    public async Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<RecuerdoDto>>("Baul not found");

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(baulId, userId) is not null;
        if (!hasAccess) return Result.Failure<IEnumerable<RecuerdoDto>>("Access denied");

        var recuerdos = (await recuerdoRepository.GetByBaulIdAsync(baulId)).ToList();

        var albumNames = (await albumRepository.GetByBaulIdAsync(baulId)).ToDictionary(a => a.Id, a => a.Name);

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
            var (nickname, avatarUrl, sharedUserId) = await GetAuthorInfoAsync(baulId, recuerdo.UserId);
            var thumbnailUrl = recuerdo.PhotoId is { } photoId ? thumbnailUrls.GetValueOrDefault(photoId) : null;
            var albumName = recuerdo.AlbumId is { } albumId ? albumNames.GetValueOrDefault(albumId) : null;
            dtos.Add(ToRecuerdoDto(recuerdo, nickname, avatarUrl, sharedUserId, recuerdo.UserId == userId, thumbnailUrl, albumName));
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

        var hasAccess = baul.CustodioId == userId
            || await baulRepository.GetSharedUserByUserIdAsync(baulId, userId) is not null;
        if (!hasAccess)
        {
            logger.LogWarning("Recuerdo creation rejected: access denied {BaulId}", baulId);
            return Result.Failure<RecuerdoDto>("Access denied");
        }

        var (nickname, avatarUrl, sharedUserId) = await GetAuthorInfoAsync(baulId, userId);
        var recuerdo = new Recuerdo(idGenerator.NewId(), null, null, baulId, userId, text, clock.UtcNow());
        await recuerdoRepository.CreateAsync(recuerdo);

        logger.LogInformation("Recuerdo created {BaulId} {RecuerdoId}", baulId, recuerdo.Id);

        return ToRecuerdoDto(recuerdo, nickname, avatarUrl, sharedUserId, isOwn: true, photoThumbnailUrl: null, albumName: null);
    }

    private static RecuerdoDto ToRecuerdoDto(
        Recuerdo recuerdo, string userName, string? userAvatar, string? sharedUserId, bool isOwn, string? photoThumbnailUrl,
        string? albumName) =>
        new(recuerdo.Id.ToString(), recuerdo.PhotoId?.ToString(), recuerdo.UserId, recuerdo.Text, userName,
            recuerdo.CreatedAt, isOwn, photoThumbnailUrl, userAvatar, sharedUserId, recuerdo.AlbumId?.ToString(), albumName);
}
