using ElBaul.Domain;
namespace ElBaul.Core.Feed.Domain;
/// <summary>One user's "last seen" watermark for one baúl's feed — advanced every time that
/// user opens the baúl's Historia tab (see IBaulFeedManager.GetFeedAsync). Used both to tag
/// feed items as new/seen on the next visit and to keep already-seen activity out of the push
/// digest (the weekly email digest deliberately ignores this — see DigestActivityPolicy).</summary>
public record BaulFeedCursor(UserId UserId, BaulId BaulId, DateTime LastSeenAt);
