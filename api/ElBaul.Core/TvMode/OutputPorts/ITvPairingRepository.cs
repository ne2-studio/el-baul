using ElBaul.Core.TvMode.Domain;
namespace ElBaul.Core.TvMode.OutputPorts;
public interface ITvPairingRepository
{
    Task<TvPairing?> GetByCodeAsync(string code);
    Task CreateAsync(TvPairing pairing);
    Task UpdateAsync(TvPairing pairing);
}
