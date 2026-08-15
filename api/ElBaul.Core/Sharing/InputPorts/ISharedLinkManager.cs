using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Sharing.InputPorts;
public interface ISharedLinkManager
{
    Task<Result<CreateSharedLinkResult>> CreateForPhotoAsync(PhotoId photoId);
    Task<Result<CreateSharedLinkResult>> CreateForRecuerdoAsync(RecuerdoId recuerdoId);
    Task<Result<SharedLinkLandingDto>> GetLandingAsync(string token);
    Task<Result> RevokeAsync(string token);
}
