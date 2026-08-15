using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Bauls;
public interface IBaulManager
{
    Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync();
    Task<Result<BaulDto>> CreateAsync(string name, string? description);
    Task<Result<BaulDto>> GetByIdAsync(BaulId baulId);
    Task<Result<BaulDto>> SetCoverAsync(BaulId baulId, PhotoId photoId, PhotoCrop crop);
    Task<Result<BaulDto>> UpdateAsync(BaulId baulId, string name, string? description);
}
