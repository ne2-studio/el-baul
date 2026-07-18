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
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider) : IBaulManager
{
    public async Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync()
    {
        var userId = currentUserProvider.GetUserId();

        var owned = await baulRepository.GetOwnedByUserIdAsync(userId);
        var shared = await baulRepository.GetSharedByUserIdAsync(userId);
        var sharedCounts = await baulRepository.GetSharedUserCountsAsync(owned.Select(b => b.Id));

        var dtos = new List<BaulDto>();
        foreach (var b in owned)
            dtos.Add(await ToDtoAsync(b, isCustodio: true, BaulRole.Custodio, sharedCounts.GetValueOrDefault(b.Id)));
        foreach (var a in shared)
            dtos.Add(await ToDtoAsync(a.Baul, isCustodio: false, a.Role));

        return Result.Success<IEnumerable<BaulDto>>(dtos);
    }

    public async Task<Result<BaulDto>> CreateAsync(string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();
        var now = clock.UtcNow();

        var baul = new Baul(idGenerator.NewId(), name, description, userId, 0, now, now);
        await baulRepository.CreateAsync(baul);

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

        var role = isCustodio ? BaulRole.Custodio : sharedAccess?.Role ?? BaulRole.Miembro;
        var sharedCount = isCustodio ? (await baulRepository.GetSharedUsersAsync(baulId)).Count() : 0;
        return await ToDtoAsync(baul, isCustodio, role, sharedCount);
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
        if (baul.CustodioId != userId)
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

        var sharedCount = (await baulRepository.GetSharedUsersAsync(baulId)).Count();
        return await ToDtoAsync(updated, isCustodio: true, BaulRole.Custodio, sharedCount);
    }

    public async Task<Result<BaulPreviewDto>> GetPreviewAsync(Guid baulId)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<BaulPreviewDto>("Baul not found");

        var photos = await photoRepository.GetPreviewPhotosAsync(baulId, 4);
        var urls = new List<string>();
        foreach (var photo in photos)
        {
            urls.Add(await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.InvitationPreview));
        }

        return new BaulPreviewDto(baul.Id.ToString(), baul.Name, baul.Description, urls);
    }

    public async Task<Result> AcceptInviteAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Baul invitation acceptance rejected: baul not found {BaulId}", baulId);
            return Result.Failure("Baul not found");
        }

        if (baul.CustodioId == userId) return Result.Success();

        var existing = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (existing is not null) return Result.Success();

        var user = await userRepository.GetByIdAsync(userId);
        var sharedUser = new SharedUser(
            idGenerator.NewId(), baulId, userId, user?.Email ?? "",
            BaulRole.Miembro, SharedUserStatus.Active, clock.UtcNow());

        await baulRepository.AddSharedUserAsync(sharedUser);
        logger.LogInformation("Baul invitation accepted {BaulId}", baulId);
        return Result.Success();
    }

    public async Task<Result<IEnumerable<SharedUserDto>>> GetSharedUsersAsync(Guid baulId)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<SharedUserDto>>("Baul not found");

        var sharedUsers = await baulRepository.GetSharedUsersAsync(baulId);
        var dtos = new List<SharedUserDto>();

        foreach (var sharedUser in sharedUsers)
        {
            string? name = null;
            if (sharedUser.UserId is not null)
            {
                var user = await userRepository.GetByIdAsync(sharedUser.UserId);
                name = user?.Name;
            }

            dtos.Add(ToDto(sharedUser, name));
        }

        var custodian = await userRepository.GetByIdAsync(baul.CustodioId);
        if (custodian is null) return Result.Failure<IEnumerable<SharedUserDto>>("Custodian user not found");

        var custodianDto = new SharedUserDto(
            "custodian-" + baul.CustodioId, baul.CustodioId, custodian.Email, custodian.Name,
            BaulRole.Custodio.ToApiString(), SharedUserStatus.Active.ToApiString(), baul.CreatedAt, baul.Id.ToString());

        return Result.Success<IEnumerable<SharedUserDto>>(new[] { custodianDto }.Concat(dtos));
    }

    public async Task<Result<SharedUserDto>> ShareAsync(Guid baulId, string email, string role)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Baul share rejected: baul not found {BaulId}", baulId);
            return Result.Failure<SharedUserDto>("Baul not found");
        }
        if (baul.CustodioId != userId)
        {
            logger.LogWarning("Baul share rejected: access denied {BaulId}", baulId);
            return Result.Failure<SharedUserDto>("Access denied");
        }

        if (!DtoMapping.TryParseBaulRole(role, out var parsedRole))
        {
            logger.LogWarning("Baul share rejected: invalid role {BaulId} {Role}", baulId, role);
            return Result.Failure<SharedUserDto>("Invalid role");
        }

        var existingUser = await userRepository.GetByEmailAsync(email);
        var existingInvitation = await baulRepository.GetSharedUserByEmailAsync(baulId, email);

        if (existingInvitation is not null)
        {
            var updated = existingInvitation with
            {
                Status = existingUser is not null ? SharedUserStatus.Active : SharedUserStatus.Pending,
                Role = parsedRole,
                UserId = existingUser?.Id
            };
            await baulRepository.UpdateSharedUserAsync(updated);
            logger.LogInformation("Baul share invitation updated {BaulId} {Email} {Role}", baulId, email, parsedRole);
            return ToDto(updated, existingUser?.Name);
        }

        var invitation = new SharedUser(
            idGenerator.NewId(), baulId, existingUser?.Id, email, parsedRole,
            existingUser is not null ? SharedUserStatus.Active : SharedUserStatus.Pending, clock.UtcNow());

        await baulRepository.AddSharedUserAsync(invitation);
        logger.LogInformation("Baul share invitation created {BaulId} {Email} {Role}", baulId, email, parsedRole);
        return ToDto(invitation, existingUser?.Name);
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
        if (baul.CustodioId != userId)
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

        var name = updated.UserId is not null ? (await userRepository.GetByIdAsync(updated.UserId))?.Name : null;
        return ToDto(updated, name);
    }

    public async Task<Result> RemoveSharedUserAsync(Guid baulId, string email)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null)
        {
            logger.LogWarning("Shared user removal rejected: baul not found {BaulId}", baulId);
            return Result.Failure("Baul not found");
        }
        if (baul.CustodioId != userId)
        {
            logger.LogWarning("Shared user removal rejected: access denied {BaulId}", baulId);
            return Result.Failure("Access denied");
        }

        await baulRepository.RemoveSharedUserAsync(baulId, email);
        logger.LogInformation("Shared user removed {BaulId} {Email}", baulId, email);
        return Result.Success();
    }

    public async Task<Result<IEnumerable<RemovalRequestDto>>> GetRemovalRequestsAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<RemovalRequestDto>>("Baul not found");
        if (baul.CustodioId != userId) return Result.Failure<IEnumerable<RemovalRequestDto>>("Access denied");

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
        var userProfile = await userRepository.GetByIdAsync(userId);
        var now = clock.UtcNow();
        var request = new RemovalRequest(
            idGenerator.NewId(), baulId, photoId, photo.StorageKey, photo.Caption,
            userProfile?.Name ?? "Usuario", userProfile?.Email ?? "", reason, now, RequestStatus.Pending);

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
        if (baul.CustodioId != userId)
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
        if (baul.CustodioId != userId)
        {
            logger.LogWarning("Reject removal request failed: access denied {BaulId}", baulId);
            return Result.Failure("Access denied");
        }

        await baulRepository.DeleteRemovalRequestAsync(baulId, requestId);
        logger.LogInformation("Removal request rejected {BaulId} {RemovalRequestId}", baulId, requestId);
        return Result.Success();
    }

    private async Task<BaulDto> ToDtoAsync(Baul baul, bool isCustodio, BaulRole role, int sharedCount = 0)
    {
        var coverUrl = baul.CoverPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(baul.CoverPhotoKey, ImagePlacement.BaulCover)
            : null;

        return new BaulDto(baul.Id.ToString(), baul.Name, baul.Description, baul.AlbumCount, coverUrl,
            baul.CreatedAt, baul.UpdatedAt, isCustodio, role.ToApiString(), sharedCount);
    }

    private static SharedUserDto ToDto(SharedUser sharedUser, string? name) =>
        new(sharedUser.Id.ToString(), sharedUser.UserId, sharedUser.Email, name,
            sharedUser.Role.ToApiString(), sharedUser.Status.ToApiString(), sharedUser.InvitedDate,
            sharedUser.BaulId.ToString());

    private static RemovalRequestDto ToDto(RemovalRequest request, string photoUrl) =>
        new(request.Id.ToString(), request.PhotoId.ToString(), photoUrl, request.PhotoCaption,
            request.RequesterName, request.RequesterEmail, request.Reason, request.RequestDate,
            request.Status.ToApiString(), request.BaulId.ToString());
}
