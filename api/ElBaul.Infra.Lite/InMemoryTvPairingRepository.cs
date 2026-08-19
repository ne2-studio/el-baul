using ElBaul.Core.TvMode.Domain;
using ElBaul.Core.TvMode.OutputPorts;
namespace ElBaul.Infra.Lite;

public class InMemoryTvPairingRepository : ITvPairingRepository
{
    private readonly Dictionary<string, TvPairing> _pairingsByCode = new(StringComparer.Ordinal);
    private readonly Lock _lock = new();

    public Task<TvPairing?> GetByCodeAsync(string code)
    {
        lock (_lock) return Task.FromResult(_pairingsByCode.GetValueOrDefault(code));
    }

    public Task CreateAsync(TvPairing pairing)
    {
        lock (_lock) _pairingsByCode[pairing.Code] = pairing;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(TvPairing pairing)
    {
        lock (_lock) _pairingsByCode[pairing.Code] = pairing;
        return Task.CompletedTask;
    }
}
