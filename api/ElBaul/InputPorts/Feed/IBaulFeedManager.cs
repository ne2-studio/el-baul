using ElBaul.Domain;
using ElBaul.InputPorts.Feed;
using ElBaul.InputPorts.Photos;
using Ne2Studio.Common;

namespace ElBaul.InputPorts.Feed;
public interface IBaulFeedManager
{
    /// <summary>One page of recuerdos and photo-upload-batch cards for a baúl's feed, newest
    /// first. Fails with a Validation error while Features:BaulFeedEnabled is off — see
    /// IAppConfiguration.BaulFeedEnabled. skip/take mirror PhotoManager.GetPageAsync (take is
    /// clamped server-side).</summary>
    Task<Result<FeedPageDto>> GetFeedAsync(BaulId baulId, int skip, int take);

    /// <summary>Every active photo in one upload batch, chronologically ascending — backs the
    /// batch's own grid/gallery reached from a feed card.</summary>
    Task<Result<IEnumerable<PhotoDto>>> GetBatchPhotosAsync(BaulId baulId, Guid batchId);
}
