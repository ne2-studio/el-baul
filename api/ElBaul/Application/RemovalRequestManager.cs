using CSharpFunctionalExtensions;
using Microsoft.Extensions.Logging;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class RemovalRequestManager(
    ILogger<RemovalRequestManager> logger,
    IBaulRepository baulRepository,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IUserRepository userRepository,
    IPhotoStorage photoStorage,
    IIdGenerator idGenerator,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    BaulAccessService baulAccess) : IRemovalRequestManager
{
    public async Task<Result<IEnumerable<RemovalRequestDto>>> GetRemovalRequestsAsync(Guid baulId)
    {
        var id = new BaulId(baulId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(id, userId, AccessLevel.Admin, "Removal requests", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<IEnumerable<RemovalRequestDto>>(auth.Error);

        var requests = await baulRepository.GetRemovalRequestsAsync(id);
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
        var bId = new BaulId(baulId);
        var pId = new PhotoId(photoId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(bId, userId, AccessLevel.Member, "Removal request creation", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure<RemovalRequestDto>(auth.Error);
        var access = auth.Value;

        var photo = await photoRepository.GetByIdAsync(pId);
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
            new RemovalRequestId(idGenerator.NewId()), bId, pId, photo.StorageKey,
            nickname, userProfile?.Email ?? "", reason, now, RequestStatus.Pending);

        await baulRepository.CreateRemovalRequestAsync(request);
        logger.LogInformation(
            "Removal request created {BaulId} {PhotoId} {RemovalRequestId}", baulId, photoId, request.Id);

        var url = await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.RemovalRequestThumbnail);
        return ToDto(request, url);
    }

    public async Task<Result> ApproveRemovalRequestAsync(Guid baulId, Guid requestId)
    {
        var bId = new BaulId(baulId);
        var rId = new RemovalRequestId(requestId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(bId, userId, AccessLevel.Admin, "Removal request approval", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        var request = await baulRepository.GetRemovalRequestAsync(bId, rId);
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
        await baulRepository.DeleteRemovalRequestAsync(bId, rId);

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
        var bId = new BaulId(baulId);
        var rId = new RemovalRequestId(requestId);
        var userId = currentUserProvider.GetUserId();

        var auth = await baulAccess.AuthorizeAsync(bId, userId, AccessLevel.Admin, "Removal request rejection", new { BaulId = baulId });
        if (auth.IsFailure) return Result.Failure(auth.Error);

        await baulRepository.DeleteRemovalRequestAsync(bId, rId);
        logger.LogInformation("Removal request rejected {BaulId} {RemovalRequestId}", baulId, requestId);
        return Result.Success();
    }

    private static RemovalRequestDto ToDto(RemovalRequest request, string photoUrl) =>
        new(request.Id.ToString(), request.PhotoId.ToString(), photoUrl,
            request.RequesterName, request.RequesterEmail, request.Reason, request.RequestDate,
            request.Status.ToApiString(), request.BaulId.ToString());
}
