using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IBaulManager
{
    Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync();
    Task<Result<BaulDto>> CreateAsync(string name, string? description);
    Task<Result<BaulDto>> GetByIdAsync(Guid baulId);
    Task<Result<BaulPreviewDto>> GetInvitePreviewAsync(Guid sharedUserId);
    Task<Result<SharedUserDto>> AcceptPersonalInviteAsync(Guid sharedUserId);
    Task<Result<BaulDto>> SetCoverAsync(Guid baulId, Guid photoId);
    Task<Result<BaulDto>> UpdateAsync(Guid baulId, string name, string? description);

    Task<Result<IEnumerable<SharedUserDto>>> GetSharedUsersAsync(Guid baulId);
    Task<Result<SharedUserDto>> GetPersonaAsync(Guid baulId, Guid sharedUserId);
    Task<Result<SharedUserDto>> CreatePersonaAsync(Guid baulId, string nickname);
    Task<Result<SharedUserDto>> UpdatePersonaAsync(Guid baulId, Guid sharedUserId, string? name, string nickname);
    Task<Result<SharedUserDto>> UpdatePersonaAvatarAsync(
        Guid baulId, Guid sharedUserId, Stream content, string fileName, string contentType);
    Task<Result<SharedUserDto>> UpdateSharedUserRoleAsync(Guid baulId, Guid sharedUserId, string role);
    Task<Result> RemoveSharedUserAsync(Guid baulId, Guid sharedUserId);

    Task<Result<IEnumerable<RemovalRequestDto>>> GetRemovalRequestsAsync(Guid baulId);
    Task<Result<RemovalRequestDto>> CreateRemovalRequestAsync(Guid baulId, Guid photoId, string? reason);
    Task<Result> ApproveRemovalRequestAsync(Guid baulId, Guid requestId);
    Task<Result> RejectRemovalRequestAsync(Guid baulId, Guid requestId);
}
