using ElBaul.Ports.Output;

namespace ElBaul.Ports.Input;

public interface ISharedLinkManager
{
    Task<Result<CreateSharedLinkResult>> CreateForPhotoAsync(PhotoId photoId);
    Task<Result<CreateSharedLinkResult>> CreateForRecuerdoAsync(RecuerdoId recuerdoId);
    Task<Result<SharedLinkLandingDto>> GetLandingAsync(string token);
    Task<Result> RevokeAsync(string token);
}
