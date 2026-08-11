using ElBaul.InputPorts.Sharing;
using ElBaul.OutputPorts.Shared;
using ElBaul.Shared;

namespace ElBaul.InputPorts.Sharing;
public interface ISharedLinkManager
{
    Task<Result<CreateSharedLinkResult>> CreateForPhotoAsync(PhotoId photoId);
    Task<Result<CreateSharedLinkResult>> CreateForRecuerdoAsync(RecuerdoId recuerdoId);
    Task<Result<SharedLinkLandingDto>> GetLandingAsync(string token);
    Task<Result> RevokeAsync(string token);
}
