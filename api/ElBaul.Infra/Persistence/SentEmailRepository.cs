using ElBaul.Application.Notifications;
using ElBaul.Domain;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Users;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.Persistence;

public class SentEmailRepository(ElBaulDbContext dbContext) : ISentEmailRepository
{
    public Task<SentEmail?> GetByDeduplicationKeyAsync(string deduplicationKey) =>
        dbContext.SentEmails.AsNoTracking().FirstOrDefaultAsync(e => e.DeduplicationKey == deduplicationKey);

    // Native upsert (ON CONFLICT DO NOTHING) rather than INSERT + catch(UniqueViolation) — same
    // rationale as UserRepository.UpsertAsync: a caught DbUpdateException doesn't leave the
    // underlying Postgres transaction any more usable than an uncaught one would (a failed
    // statement aborts the whole transaction until rollback, .NET-level catch or not), and this
    // was never wrapped in IUnitOfWork.ExecuteInTransactionAsync for the separate reason
    // documented on EmailDeliveryCoordinator.SendAsync (needs an immediate commit to act as a
    // cross-process lock between concurrent Hangfire workers). As a side effect, this also drops
    // the entity from the change tracker entirely instead of having to explicitly detach it.
    public async Task<bool> TryReserveAsync(SentEmail pendingEmail)
    {
        var inserted = await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "SentEmails" ("Id", "UserId", "Type", "Subject", "RecipientEmail", "TemplateVersion", "Locale", "Status", "DeduplicationKey", "CreatedAt", "ActivitySince", "ActivityUntil")
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, {10}, {11})
            ON CONFLICT ("DeduplicationKey") DO NOTHING
            """,
            pendingEmail.Id, pendingEmail.UserId.Value, pendingEmail.Type.ToString(), pendingEmail.Subject,
            pendingEmail.RecipientEmail, pendingEmail.TemplateVersion, pendingEmail.Locale, pendingEmail.Status.ToString(),
            pendingEmail.DeduplicationKey, pendingEmail.CreatedAt,
            // Null-forgiving: both are legitimately nullable columns, Npgsql binds a null object
            // as SQL NULL correctly — this only silences the analyzer's blanket non-null
            // expectation for `params object[]`.
            pendingEmail.ActivitySince!, pendingEmail.ActivityUntil!);

        return inserted == 1;
    }

    public async Task UpdateAsync(SentEmail email)
    {
        dbContext.SentEmails.Update(email);
        await dbContext.SaveChangesAsync();
        dbContext.Entry(email).State = EntityState.Detached;
    }

    public Task RegisterOpenAsync(Guid sentEmailId, DateTime openedAt) =>
        dbContext.SentEmails
            .Where(e => e.Id == sentEmailId && e.FirstOpenedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(e => e.FirstOpenedAt, openedAt));

    public async Task<HashSet<UserId>> GetUserIdsWithSentEmailAsync(EmailType type) =>
        (await dbContext.SentEmails.AsNoTracking()
            .Where(e => e.Type == type && (e.Status == EmailStatus.Sent || e.Status == EmailStatus.Delivered))
            .Select(e => e.UserId)
            .Distinct()
            .ToListAsync())
        .ToHashSet();

    public async Task<HashSet<UserId>> GetUserIdsWithBlockedStatusAsync() =>
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

    public async Task<IEnumerable<SentEmail>> GetByUserIdAsync(UserId userId) =>
        await dbContext.SentEmails.AsNoTracking()
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

    public async Task<DateTime?> GetLatestSentAtAsync(UserId userId, EmailType type) =>
        await dbContext.SentEmails.AsNoTracking()
            .Where(e => e.UserId == userId && e.Type == type && e.Status == EmailStatus.Sent)
            .OrderByDescending(e => e.SentAt)
            .Select(e => e.SentAt)
            .FirstOrDefaultAsync();

    public async Task<Dictionary<UserId, DateTime>> GetLatestSentAtByTypeAsync(EmailType type) =>
        await dbContext.SentEmails.AsNoTracking()
            .Where(e => e.Type == type && e.Status == EmailStatus.Sent && e.SentAt != null)
            .GroupBy(e => e.UserId)
            .Select(g => new { UserId = g.Key, SentAt = g.Max(e => e.SentAt!.Value) })
            .ToDictionaryAsync(x => x.UserId, x => x.SentAt);
}
