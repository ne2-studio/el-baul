using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemorySentEmailRepository : ISentEmailRepository
{
    private readonly Dictionary<Guid, SentEmail> _emails = new();
    private readonly Lock _lock = new();

    public Task<SentEmail?> GetByDeduplicationKeyAsync(string deduplicationKey)
    {
        lock (_lock) return Task.FromResult(_emails.Values.FirstOrDefault(e => e.DeduplicationKey == deduplicationKey));
    }

    public Task<bool> TryReserveAsync(SentEmail pendingEmail)
    {
        lock (_lock)
        {
            if (_emails.Values.Any(e => e.DeduplicationKey == pendingEmail.DeduplicationKey))
            {
                return Task.FromResult(false);
            }

            _emails[pendingEmail.Id] = pendingEmail;
            return Task.FromResult(true);
        }
    }

    public Task UpdateAsync(SentEmail email)
    {
        lock (_lock) _emails[email.Id] = email;
        return Task.CompletedTask;
    }

    public Task<HashSet<string>> GetUserIdsWithSentEmailAsync(EmailType type)
    {
        lock (_lock)
        {
            return Task.FromResult(_emails.Values
                .Where(e => e.Type == type && (e.Status == EmailStatus.Sent || e.Status == EmailStatus.Delivered))
                .Select(e => e.UserId)
                .ToHashSet());
        }
    }

    public Task<HashSet<string>> GetUserIdsWithBlockedStatusAsync()
    {
        lock (_lock)
        {
            return Task.FromResult(_emails.Values
                .Where(e => e.Status is EmailStatus.Bounced or EmailStatus.Complained)
                .Select(e => e.UserId)
                .ToHashSet());
        }
    }

    public Task<IEnumerable<SentEmail>> GetRecentAsync(int limit)
    {
        lock (_lock) return Task.FromResult(_emails.Values.OrderByDescending(e => e.CreatedAt).Take(limit).ToList().AsEnumerable());
    }

    public Task<IEnumerable<SentEmail>> GetByUserIdAsync(string userId)
    {
        lock (_lock) return Task.FromResult(_emails.Values.Where(e => e.UserId == userId).OrderByDescending(e => e.CreatedAt).ToList().AsEnumerable());
    }

    public Task<DateTime?> GetLatestSentAtAsync(string userId, EmailType type)
    {
        lock (_lock)
        {
            return Task.FromResult(_emails.Values
                .Where(e => e.UserId == userId && e.Type == type && e.Status == EmailStatus.Sent)
                .OrderByDescending(e => e.SentAt)
                .Select(e => e.SentAt)
                .FirstOrDefault());
        }
    }

    public Task<Dictionary<string, DateTime>> GetLatestSentAtByTypeAsync(EmailType type)
    {
        lock (_lock)
        {
            return Task.FromResult(_emails.Values
                .Where(e => e.Type == type && e.Status == EmailStatus.Sent && e.SentAt != null)
                .GroupBy(e => e.UserId)
                .ToDictionary(g => g.Key, g => g.Max(e => e.SentAt!.Value)));
        }
    }

    public IReadOnlyCollection<SentEmail> All
    {
        get { lock (_lock) return _emails.Values.ToList(); }
    }
}
