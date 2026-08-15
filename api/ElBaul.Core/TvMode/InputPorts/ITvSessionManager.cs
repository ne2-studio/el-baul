using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.TvMode.InputPorts;
public interface ITvSessionManager
{
    Task<Result<CreateTvSessionResult>> CreateAsync(BaulId baulId);
    Task<Result<TvSessionContentDto>> GetContentAsync(string token);
    Task<Result> CancelAsync(string token);
}
