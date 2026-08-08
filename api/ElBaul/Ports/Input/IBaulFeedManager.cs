using ElBaul.Ports.Output;

namespace ElBaul.Ports.Input;

public interface IBaulFeedManager
{
    /// <summary>Recuerdos and photo-upload-batch cards for a baúl's feed, newest first. Fails
    /// with a Validation error while Features:BaulFeedEnabled is off — see
    /// IAppConfiguration.BaulFeedEnabled.</summary>
    Task<Result<IEnumerable<FeedItemDto>>> GetFeedAsync(BaulId baulId);

    /// <summary>Every active photo in one upload batch, chronologically ascending — backs the
    /// batch's own grid/gallery reached from a feed card.</summary>
    Task<Result<IEnumerable<PhotoDto>>> GetBatchPhotosAsync(BaulId baulId, Guid batchId);
}
