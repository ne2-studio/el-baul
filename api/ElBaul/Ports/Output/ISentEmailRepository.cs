namespace ElBaul.Ports.Output;

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

    Task<HashSet<string>> GetUserIdsWithSentEmailAsync(EmailType type);

    /// <summary>
    /// Users with a Bounced/Complained SentEmail in their history. Always empty until
    /// Resend webhook processing exists (a later phase) — the eligibility filter is wired
    /// up now so nothing needs to change there when it does.
    /// </summary>
    Task<HashSet<string>> GetUserIdsWithBlockedStatusAsync();

    Task<IEnumerable<SentEmail>> GetRecentAsync(int limit);
}
