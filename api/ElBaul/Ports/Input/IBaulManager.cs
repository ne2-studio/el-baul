using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Ports.Input;

public interface IBaulManager
{
    Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync();
    Task<Result<BaulDto>> CreateAsync(string name, string? description);
    Task<Result<BaulDto>> GetByIdAsync(BaulId baulId);
    Task<Result<BaulDto>> SetCoverAsync(BaulId baulId, PhotoId photoId);
    Task<Result<BaulDto>> UpdateAsync(BaulId baulId, string name, string? description);

    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(BaulId baulId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(BaulId baulId, string text);
}
