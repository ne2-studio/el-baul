using ElBaul.Domain;
namespace ElBaul.Core.Notifications.OutputPorts;
public interface ISentEmailRepository
{
    Task<SentEmail?> GetByDeduplicationKeyAsync(string deduplicationKey);

    /// <summary>
    /// Inserts a new SentEmail row. Returns false instead of throwing if another worker
    /// already reserved the same DeduplicationKey (unique index violation) — this is the
    /// real concurrency guard against double-sending, not an app-level check-then-act.
    /// </summary>
    Task<bool> TryReserveAsync(SentEmail pendingEmail);

    Task UpdateAsync(SentEmail email);

    /// <summary>
    /// Stamps FirstOpenedAt the first time the tracking pixel fires for this email; a no-op if
    /// it's already set. One atomic guarded update — unlike EmailLinkClicks there's no separate
    /// row to lazily create, the SentEmails row already exists by send time.
    /// </summary>
    Task RegisterOpenAsync(Guid sentEmailId, DateTime openedAt);

    /// <summary>
    /// Users with a *successfully* Sent (or later, Delivered) email of the given type — used
    /// as the welcome-email scheduler's "already handled, don't retry" filter. Must not count
    /// Pending/Sending/Failed rows, or a user whose only attempt failed (e.g. a transient
    /// Resend rate-limit error) would look "already sent" and never get retried by the
    /// scheduler again — Hangfire's own automatic retry is the only thing that would still
    /// pick them up, and only for a bounded number of attempts.
    /// </summary>
    Task<HashSet<UserId>> GetUserIdsWithSentEmailAsync(EmailType type);

    /// <summary>
    /// Users with a Bounced/Complained SentEmail in their history. Always empty until
    /// Resend webhook processing exists (a later phase) — the eligibility filter is wired
    /// up now so nothing needs to change there when it does.
    /// </summary>
    Task<HashSet<UserId>> GetUserIdsWithBlockedStatusAsync();

    Task<IEnumerable<SentEmail>> GetRecentAsync(int limit);

    /// <summary>Every email ever sent/attempted for one user, most recent first — the admin's per-user history.</summary>
    Task<IEnumerable<SentEmail>> GetByUserIdAsync(UserId userId);

    /// <summary>SentAt of the most recent successfully-Sent email of the given type for one user (null if none).</summary>
    Task<DateTime?> GetLatestSentAtAsync(UserId userId, EmailType type);

    /// <summary>Bulk version of GetLatestSentAtAsync, for the digest scheduler's candidate pool.</summary>
    Task<Dictionary<UserId, DateTime>> GetLatestSentAtByTypeAsync(EmailType type);
}
