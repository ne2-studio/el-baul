using ElBaul.Core.Sharing.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Sharing.OutputPorts;
public interface ISharedLinkRepository
{
    Task<SharedLink?> GetByTokenAsync(string token);

    /// <summary>Every SharedLink (revoked or not) pointing at any of these photos — used by
    /// PhotoDuplicateMergeService to redirect a duplicate's share links onto the survivor
    /// before it's soft-deleted.</summary>
    Task<IEnumerable<SharedLink>> GetByPhotoIdsAsync(IEnumerable<PhotoId> photoIds);

    Task CreateAsync(SharedLink sharedLink);
    Task UpdateAsync(SharedLink sharedLink);
    Task DeleteByBaulIdAsync(BaulId baulId);
}
