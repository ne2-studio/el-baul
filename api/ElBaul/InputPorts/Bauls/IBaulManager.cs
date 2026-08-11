using ElBaul.InputPorts.Bauls;
using ElBaul.OutputPorts.Bauls;
using ElBaul.Shared;

namespace ElBaul.InputPorts.Bauls;
public interface IBaulManager
{
    Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync();
    Task<Result<BaulDto>> CreateAsync(string name, string? description);
    Task<Result<BaulDto>> GetByIdAsync(BaulId baulId);
    Task<Result<BaulDto>> SetCoverAsync(BaulId baulId, PhotoId photoId);
    Task<Result<BaulDto>> UpdateAsync(BaulId baulId, string name, string? description);
}
