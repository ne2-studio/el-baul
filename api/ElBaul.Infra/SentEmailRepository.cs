using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ElBaul.Infra;

public class SentEmailRepository(ElBaulDbContext dbContext) : ISentEmailRepository
{
    public Task<SentEmail?> GetByDeduplicationKeyAsync(string deduplicationKey) =>
        dbContext.SentEmails.AsNoTracking().FirstOrDefaultAsync(e => e.DeduplicationKey == deduplicationKey);

    public async Task<bool> TryReserveAsync(SentEmail pendingEmail)
    {
        dbContext.SentEmails.Add(pendingEmail);
        try
        {
            await dbContext.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Another worker (or an earlier run of the same recurring job) already reserved
            // this DeduplicationKey — detach so this request-scoped context doesn't keep
            // retrying the same failed insert on a later SaveChangesAsync.
            return false;
        }
        finally
        {
            // SentEmail is a record: WelcomeEmailManager tracks state via `existing with
            // {...}` (a new instance per transition, Pending -> Sending -> Sent/Failed) and
            // calls UpdateAsync for each — detach here so a later Update() with a different
            // instance for the same Id doesn't collide with this one still being tracked.
            dbContext.Entry(pendingEmail).State = EntityState.Detached;
        }
    }

    public async Task UpdateAsync(SentEmail email)
    {
        dbContext.SentEmails.Update(email);
        await dbContext.SaveChangesAsync();
        dbContext.Entry(email).State = EntityState.Detached;
    }

    public async Task<HashSet<string>> GetUserIdsWithSentEmailAsync(EmailType type) =>
        (await dbContext.SentEmails.AsNoTracking()
            .Where(e => e.Type == type)
            .Select(e => e.UserId)
            .Distinct()
            .ToListAsync())
        .ToHashSet();

    public async Task<HashSet<string>> GetUserIdsWithBlockedStatusAsync() =>
        (await dbContext.SentEmails.AsNoTracking()
            .Where(e => e.Status == EmailStatus.Bounced || e.Status == EmailStatus.Complained)
            .Select(e => e.UserId)
            .Distinct()
            .ToListAsync())
        .ToHashSet();

    public async Task<IEnumerable<SentEmail>> GetRecentAsync(int limit) =>
        await dbContext.SentEmails.AsNoTracking()
            .OrderByDescending(e => e.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public async Task<DateTime?> GetLatestSentAtAsync(string userId, EmailType type) =>
        await dbContext.SentEmails.AsNoTracking()
            .Where(e => e.UserId == userId && e.Type == type && e.Status == EmailStatus.Sent)
            .OrderByDescending(e => e.SentAt)
            .Select(e => e.SentAt)
            .FirstOrDefaultAsync();

    public async Task<Dictionary<string, DateTime>> GetLatestSentAtByTypeAsync(EmailType type) =>
        await dbContext.SentEmails.AsNoTracking()
            .Where(e => e.Type == type && e.Status == EmailStatus.Sent && e.SentAt != null)
            .GroupBy(e => e.UserId)
            .Select(g => new { UserId = g.Key, SentAt = g.Max(e => e.SentAt!.Value) })
            .ToDictionaryAsync(x => x.UserId, x => x.SentAt);
}
