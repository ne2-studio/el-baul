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
    IActivityRepository activityRepository,
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

        var dtos = owned.Select(b => ToDto(b, isCustodio: true, BaulRole.Custodio))
            .Concat(shared.Select(a => ToDto(a.Baul, isCustodio: false, a.Role)));

        return Result.Success(dtos);
    }

    public async Task<Result<BaulDto>> CreateAsync(string name, string? description)
    {
        var userId = currentUserProvider.GetUserId();
        var now = clock.UtcNow();

        var baul = new Baul(idGenerator.NewId(), name, description, userId, 0, now, now);
        await baulRepository.CreateAsync(baul);

        logger.LogInformation("CreateAsync - Baul {Id} created by {UserId}", baul.Id, userId);
        return ToDto(baul, isCustodio: true, BaulRole.Custodio);
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
        return ToDto(baul, isCustodio, role);
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
        if (baul is null) return Result.Failure("Baul not found");

        if (baul.CustodioId == userId) return Result.Success();

        var existing = await baulRepository.GetSharedUserByUserIdAsync(baulId, userId);
        if (existing is not null) return Result.Success();

        var user = await userRepository.GetByIdAsync(userId);
        var sharedUser = new SharedUser(
            idGenerator.NewId(), baulId, userId, user?.Email ?? "",
            BaulRole.Miembro, SharedUserStatus.Active, clock.UtcNow());

        await baulRepository.AddSharedUserAsync(sharedUser);
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
        if (baul is null) return Result.Failure<SharedUserDto>("Baul not found");
        if (baul.CustodioId != userId) return Result.Failure<SharedUserDto>("Access denied");

        if (!DtoMapping.TryParseBaulRole(role, out var parsedRole))
            return Result.Failure<SharedUserDto>("Invalid role");

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
            return ToDto(updated, existingUser?.Name);
        }

        var invitation = new SharedUser(
            idGenerator.NewId(), baulId, existingUser?.Id, email, parsedRole,
            existingUser is not null ? SharedUserStatus.Active : SharedUserStatus.Pending, clock.UtcNow());

        await baulRepository.AddSharedUserAsync(invitation);
        return ToDto(invitation, existingUser?.Name);
    }

    public async Task<Result<SharedUserDto>> UpdateSharedUserRoleAsync(Guid baulId, Guid sharedUserId, string role)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<SharedUserDto>("Baul not found");
        if (baul.CustodioId != userId) return Result.Failure<SharedUserDto>("Access denied");

        if (!DtoMapping.TryParseBaulRole(role, out var parsedRole))
            return Result.Failure<SharedUserDto>("Invalid role");

        var sharedUser = await baulRepository.GetSharedUserByIdAsync(sharedUserId);
        if (sharedUser is null) return Result.Failure<SharedUserDto>("Shared user not found");

        var updated = sharedUser with { Role = parsedRole };
        await baulRepository.UpdateSharedUserAsync(updated);

        await activityRepository.CreateAsync(new Activity(
            idGenerator.NewId(), ActivityType.RoleChanged, baulId, baul.Name, clock.UtcNow(),
            false, null, null, null, null));

        var name = updated.UserId is not null ? (await userRepository.GetByIdAsync(updated.UserId))?.Name : null;
        return ToDto(updated, name);
    }

    public async Task<Result> RemoveSharedUserAsync(Guid baulId, string email)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure("Baul not found");
        if (baul.CustodioId != userId) return Result.Failure("Access denied");

        await baulRepository.RemoveSharedUserAsync(baulId, email);
        return Result.Success();
    }

    public async Task<Result<IEnumerable<AccessRequestDto>>> GetAccessRequestsAsync(Guid baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<IEnumerable<AccessRequestDto>>("Baul not found");
        if (baul.CustodioId != userId) return Result.Failure<IEnumerable<AccessRequestDto>>("Access denied");

        var requests = await baulRepository.GetAccessRequestsAsync(baulId);
        return Result.Success(requests.Select(ToDto));
    }

    public async Task<Result<AccessRequestDto>> CreateAccessRequestAsync(Guid baulId, string? message)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<AccessRequestDto>("Baul not found");

        var userProfile = await userRepository.GetByIdAsync(userId);
        var now = clock.UtcNow();
        var request = new AccessRequest(
            idGenerator.NewId(), baulId, userProfile?.Email ?? "", userProfile?.Name, message, now, RequestStatus.Pending);

        await baulRepository.CreateAccessRequestAsync(request);

        await activityRepository.CreateAsync(new Activity(
            idGenerator.NewId(), ActivityType.AccessRequest, baulId, baul.Name, now,
            true, null, request.Email, request.Id, null));

        return ToDto(request);
    }

    public async Task<Result<SharedUserDto>> ApproveAccessRequestAsync(Guid baulId, Guid requestId, string role)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure<SharedUserDto>("Baul not found");
        if (baul.CustodioId != userId) return Result.Failure<SharedUserDto>("Access denied");

        if (!DtoMapping.TryParseBaulRole(role, out var parsedRole))
            return Result.Failure<SharedUserDto>("Invalid role");

        var request = await baulRepository.GetAccessRequestAsync(baulId, requestId);
        if (request is null) return Result.Failure<SharedUserDto>("Request not found");

        var invitedUser = await userRepository.GetByEmailAsync(request.Email);
        if (invitedUser is null) return Result.Failure<SharedUserDto>("User not found");

        var now = clock.UtcNow();
        var sharedUser = new SharedUser(
            idGenerator.NewId(), baulId, invitedUser.Id, invitedUser.Email, parsedRole, SharedUserStatus.Active, now);

        await baulRepository.AddSharedUserAsync(sharedUser);
        await baulRepository.DeleteAccessRequestAsync(baulId, requestId);

        await activityRepository.CreateAsync(new Activity(
            idGenerator.NewId(), ActivityType.AccessGranted, baulId, baul.Name, now,
            false, null, request.Email, null, null));

        return ToDto(sharedUser, invitedUser.Name);
    }

    public async Task<Result> RejectAccessRequestAsync(Guid baulId, Guid requestId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure("Baul not found");
        if (baul.CustodioId != userId) return Result.Failure("Access denied");

        await baulRepository.DeleteAccessRequestAsync(baulId, requestId);
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
        if (baul is null) return Result.Failure<RemovalRequestDto>("Baul not found");

        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null) return Result.Failure<RemovalRequestDto>("Photo not found");

        var userId = currentUserProvider.GetUserId();
        var userProfile = await userRepository.GetByIdAsync(userId);
        var now = clock.UtcNow();
        var request = new RemovalRequest(
            idGenerator.NewId(), baulId, photoId, photo.StorageKey, photo.Caption,
            userProfile?.Name ?? "Usuario", userProfile?.Email ?? "", reason, now, RequestStatus.Pending);

        await baulRepository.CreateRemovalRequestAsync(request);

        await activityRepository.CreateAsync(new Activity(
            idGenerator.NewId(), ActivityType.PhotoRemovalRequest, baulId, baul.Name, now,
            true, null, null, null, request.Id));

        var url = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.RemovalRequestThumbnail);
        return ToDto(request, url);
    }

    public async Task<Result> ApproveRemovalRequestAsync(Guid baulId, Guid requestId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure("Baul not found");
        if (baul.CustodioId != userId) return Result.Failure("Access denied");

        var request = await baulRepository.GetRemovalRequestAsync(baulId, requestId);
        if (request is null) return Result.Failure("Request not found");

        var photo = await photoRepository.GetByIdAsync(request.PhotoId);
        if (photo is not null)
        {
            var album = await albumRepository.GetByIdAsync(photo.AlbumId);
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

        return Result.Success();
    }

    public async Task<Result> RejectRemovalRequestAsync(Guid baulId, Guid requestId)
    {
        var userId = currentUserProvider.GetUserId();
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return Result.Failure("Baul not found");
        if (baul.CustodioId != userId) return Result.Failure("Access denied");

        await baulRepository.DeleteRemovalRequestAsync(baulId, requestId);
        return Result.Success();
    }

    private static BaulDto ToDto(Baul baul, bool isCustodio, BaulRole role) =>
        new(baul.Id.ToString(), baul.Name, baul.Description, baul.AlbumCount, baul.CreatedAt, baul.UpdatedAt,
            isCustodio, role.ToApiString());

    private static SharedUserDto ToDto(SharedUser sharedUser, string? name) =>
        new(sharedUser.Id.ToString(), sharedUser.UserId, sharedUser.Email, name,
            sharedUser.Role.ToApiString(), sharedUser.Status.ToApiString(), sharedUser.InvitedDate,
            sharedUser.BaulId.ToString());

    private static AccessRequestDto ToDto(AccessRequest request) =>
        new(request.Id.ToString(), request.Email, request.Name, request.Message, request.RequestDate,
            request.Status.ToApiString(), request.BaulId.ToString());

    private static RemovalRequestDto ToDto(RemovalRequest request, string photoUrl) =>
        new(request.Id.ToString(), request.PhotoId.ToString(), photoUrl, request.PhotoCaption,
            request.RequesterName, request.RequesterEmail, request.Reason, request.RequestDate,
            request.Status.ToApiString(), request.BaulId.ToString());
}
