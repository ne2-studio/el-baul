using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IBaulManager
{
    Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync();
    Task<Result<BaulDto>> CreateAsync(string name, string? description);
    Task<Result<BaulDto>> GetByIdAsync(Guid baulId);
    Task<Result<BaulDto>> SetCoverAsync(Guid baulId, Guid photoId);
    Task<Result<BaulDto>> UpdateAsync(Guid baulId, string name, string? description);

    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid baulId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid baulId, string text);
}
