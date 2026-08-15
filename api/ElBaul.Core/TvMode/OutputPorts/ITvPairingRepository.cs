namespace ElBaul.OutputPorts.TvMode;
public interface ITvPairingRepository
{
    Task<TvPairing?> GetByCodeAsync(string code);
    Task CreateAsync(TvPairing pairing);
    Task UpdateAsync(TvPairing pairing);
}
