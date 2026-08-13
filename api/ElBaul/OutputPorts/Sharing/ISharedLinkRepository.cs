using ElBaul.Domain;
namespace ElBaul.OutputPorts.Sharing;
public interface ISharedLinkRepository
{
    Task<SharedLink?> GetByTokenAsync(string token);
    Task CreateAsync(SharedLink sharedLink);
    Task UpdateAsync(SharedLink sharedLink);
    Task DeleteByBaulIdAsync(BaulId baulId);
}
