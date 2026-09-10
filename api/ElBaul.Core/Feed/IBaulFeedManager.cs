using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Feed;
public interface IBaulFeedManager
{
    /// <summary>One page of recuerdo, photo-upload-batch and chapter-created cards for a baúl's
    /// feed, newest first. Fails with a Validation error while Features:BaulFeedEnabled is off —
    /// see IAppConfiguration.BaulFeedEnabled. skip/take mirror PhotoManager.GetPageAsync (take is
    /// clamped server-side).
    ///
    /// A skip of 0 is treated as "the caller just opened this baúl's feed": items are tagged
    /// IsNew against the caller's BaulFeedCursor (everything since their last visit; a first-ever
    /// visit sees nothing as new), the page is widened as needed so no new item is ever cut off by
    /// take, and the cursor is then advanced to now — so a second call with skip 0 won't see the
    /// same items as new again. Calls with skip &gt; 0 ("load more") never touch the cursor and
    /// never tag IsNew (by construction, skip 0 already returned every new item).</summary>
    Task<Result<FeedPageDto>> GetFeedAsync(BaulId baulId, int skip, int take);

    /// <summary>Advances the current user's BaulFeedCursor for this baúl to "now" — the single,
    /// server-authoritative "the current user has seen everything in this baúl up to now" signal
    /// behind the workspace switcher's novedades dots and the feed's IsNew tags. Unlike
    /// GetFeedAsync this does NOT require Features:BaulFeedEnabled and never reads/returns the
    /// feed: it's called on every baúl entry (any tab — see BaulScopeAggregator) and after every
    /// write that bumps baul.UpdatedAt by its own actor, so a user is never shown their own
    /// activity as new. Fails only if the user can't access the baúl.</summary>
    Task<Result> MarkBaulSeenAsync(BaulId baulId);

    /// <summary>Every baúl the current user has a "last seen" watermark for. Used by
    /// GET /api/baules to derive each baúl's HasUnseenActivity without a query per baúl.</summary>
    Task<IReadOnlyDictionary<BaulId, DateTime>> GetSeenWatermarksAsync();
}
