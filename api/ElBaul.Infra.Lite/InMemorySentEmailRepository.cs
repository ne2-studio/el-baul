using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

public class InMemorySentEmailRepository : ISentEmailRepository
{
    private readonly Dictionary<Guid, SentEmail> _emails = new();

    public Task<SentEmail?> GetByDeduplicationKeyAsync(string deduplicationKey) =>
        Task.FromResult(_emails.Values.FirstOrDefault(e => e.DeduplicationKey == deduplicationKey));

    public Task<bool> TryReserveAsync(SentEmail pendingEmail)
    {
        if (_emails.Values.Any(e => e.DeduplicationKey == pendingEmail.DeduplicationKey))
        {
            return Task.FromResult(false);
        }

        _emails[pendingEmail.Id] = pendingEmail;
        return Task.FromResult(true);
    }

    public Task UpdateAsync(SentEmail email)
    {
        _emails[email.Id] = email;
        return Task.CompletedTask;
    }

    public Task<HashSet<string>> GetUserIdsWithSentEmailAsync(EmailType type) =>
        Task.FromResult(_emails.Values
            .Where(e => e.Type == type && (e.Status == EmailStatus.Sent || e.Status == EmailStatus.Delivered))
            .Select(e => e.UserId)
            .ToHashSet());

    public Task<HashSet<string>> GetUserIdsWithBlockedStatusAsync() =>
        Task.FromResult(_emails.Values
            .Where(e => e.Status is EmailStatus.Bounced or EmailStatus.Complained)
            .Select(e => e.UserId)
            .ToHashSet());

    public Task<IEnumerable<SentEmail>> GetRecentAsync(int limit) =>
        Task.FromResult(_emails.Values.OrderByDescending(e => e.CreatedAt).Take(limit));

    public Task<IEnumerable<SentEmail>> GetByUserIdAsync(string userId) =>
        Task.FromResult(_emails.Values.Where(e => e.UserId == userId).OrderByDescending(e => e.CreatedAt).AsEnumerable());

    public Task<DateTime?> GetLatestSentAtAsync(string userId, EmailType type) =>
        Task.FromResult(_emails.Values
            .Where(e => e.UserId == userId && e.Type == type && e.Status == EmailStatus.Sent)
            .OrderByDescending(e => e.SentAt)
            .Select(e => e.SentAt)
            .FirstOrDefault());

    public Task<Dictionary<string, DateTime>> GetLatestSentAtByTypeAsync(EmailType type) =>
        Task.FromResult(_emails.Values
            .Where(e => e.Type == type && e.Status == EmailStatus.Sent && e.SentAt != null)
            .GroupBy(e => e.UserId)
            .ToDictionary(g => g.Key, g => g.Max(e => e.SentAt!.Value)));

    public IReadOnlyCollection<SentEmail> All => _emails.Values;
}
