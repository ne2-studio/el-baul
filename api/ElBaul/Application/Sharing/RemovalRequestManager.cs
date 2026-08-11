using ElBaul.Application.Bauls;
using ElBaul.Application.Photos;
using ElBaul.Application.Sharing;
using ElBaul.InputPorts.Sharing;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Sharing;
using ElBaul.OutputPorts.Users;
using ElBaul.Shared;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application.Sharing;
public class RemovalRequestManager(
    ILogger<RemovalRequestManager> logger,
    IBaulRepository baulRepository,
    IPhotoRepository photoRepository,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess,
    PhotoLifecycleService photoLifecycle) : IRemovalRequestManager
{
    public async Task<Result<IEnumerable<RemovalRequestDto>>> GetRemovalRequestsAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Removal requests", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<RemovalRequestDto>>(auth.Error);

        var requests = await baulRepository.GetRemovalRequestsAsync(baulId);
        var dtos = new List<RemovalRequestDto>();
        foreach (var request in requests)
        {
            var url = await photoStorage.GetImageUrl(request.PhotoStorageKey, ImagePlacement.RemovalRequestThumbnail);
            dtos.Add(ToDto(request, url));
        }

        return Result.Success<IEnumerable<RemovalRequestDto>>(dtos);
    }

    public async Task<Result<RemovalRequestDto>> CreateRemovalRequestAsync(BaulId baulId, PhotoId photoId, string? reason)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Removal request creation", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<RemovalRequestDto>(auth.Error);
        var access = auth.Value;

        var photo = await photoRepository.GetByIdAsync(photoId);
        if (photo is null || photo.BaulId != baulId)
        {
            logger.LogWarning("Removal request creation rejected: photo not found {PhotoId}", photoId);
            return Result.Failure<RemovalRequestDto>(ApplicationError.NotFound("Photo not found"));
        }

        var nickname = access.Persona?.Nickname ?? "Usuario";
        var userProfile = await userRepository.GetByIdAsync(userId);
        var now = clock.UtcNow();
        var request = new RemovalRequest(
            new RemovalRequestId(idGenerator.NewId()), baulId, photoId, photo.StorageKey,
            nickname, userProfile?.Email ?? "", reason, now, RequestStatus.Pending);

        await baulRepository.CreateRemovalRequestAsync(request);
        logger.LogInformation("Removal request created {PhotoId} {RemovalRequestId}", photoId, request.Id);

        var url = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.RemovalRequestThumbnail);
        return ToDto(request, url);
    }

    public async Task<Result> ApproveRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Removal request approval", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        var request = await baulRepository.GetRemovalRequestAsync(baulId, requestId);
        if (request is null)
        {
            logger.LogWarning("Removal request approval rejected: request not found {RemovalRequestId}", requestId);
            return Result.Failure(ApplicationError.NotFound("Request not found"));
        }

        var photo = await photoRepository.GetByIdAsync(request.PhotoId);
        if (photo is not null)
        {
            await photoLifecycle.SoftDeleteAsync(photo, request.Reason);
        }

        await baulRepository.DeleteRemovalRequestAsync(baulId, requestId);

        logger.LogInformation(
            "Removal request approved, photo deleted {PhotoId} {RemovalRequestId} {ChapterId}",
            request.PhotoId, requestId, photo?.ChapterId);

        return Result.Success();
    }

    public async Task<Result> RejectRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId)
    {
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Admin, "Removal request rejection", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        await baulRepository.DeleteRemovalRequestAsync(baulId, requestId);
        logger.LogInformation("Removal request rejected {RemovalRequestId}", requestId);
        return Result.Success();
    }

    private static RemovalRequestDto ToDto(RemovalRequest request, string photoUrl) =>
        new(request.Id.ToString(), request.PhotoId.ToString(), photoUrl,
            request.RequesterName, request.RequesterEmail, request.Reason, request.RequestDate,
            request.Status.ToApiString(), request.BaulId.ToString());
}
