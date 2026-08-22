namespace ElBaul.Core.Analytics.OutputPorts;

// One row per "app open" the client reports (see IUserSessionManager) — deliberately raw
// events, not a pre-aggregated daily rollup like UserBaulActivityDailyAggregator, so DAU can be
// sliced by platform/entry source (or anything else added later) without a schema change.
// Consumed by Metabase directly against analytics.user_sessions, not by an admin endpoint.
public record UserSessionOpen(
    Guid Id,
    string UserId,
    DateTime OpenedAtUtc,
    DateOnly Date,
    string Platform,
    string EntrySource);
