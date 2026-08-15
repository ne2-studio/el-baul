using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.TvMode;
public interface ITvPairingManager
{
    Task<Result<CreateTvPairingResult>> CreateAsync();
    Task<Result<TvPairingStatusDto>> GetStatusAsync(string code);
    Task<Result> ClaimAsync(string code, BaulId baulId);
}
