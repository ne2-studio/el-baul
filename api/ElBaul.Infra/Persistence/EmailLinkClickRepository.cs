using ElBaul.OutputPorts.Notifications;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.Persistence;

public class EmailLinkClickRepository(ElBaulDbContext dbContext) : IEmailLinkClickRepository
{
    public Task<EmailLinkClick?> GetByTokenAsync(string token) =>
        dbContext.EmailLinkClicks.AsNoTracking().FirstOrDefaultAsync(e => e.Token == token);

    public async Task RegisterClickAsync(string token, DateTime clickedAt)
    {
        var link = await dbContext.EmailLinkClicks.FirstOrDefaultAsync(e => e.Token == token);
        if (link is null) return;

        // CurrentValues.SetValues mutates `link`'s own init-only properties in place (it *is*
        // the tracked CLR instance) — capture "was this the first click" before that happens,
        // or link.FirstClickedAt below would already reflect the new, non-null value.
        var isFirstClick = link.FirstClickedAt is null;
        var sentEmailId = link.SentEmailId;

        dbContext.Entry(link).CurrentValues.SetValues(link with
        {
            FirstClickedAt = link.FirstClickedAt ?? clickedAt,
            LastClickedAt = clickedAt,
            ClickCount = link.ClickCount + 1
        });
        await dbContext.SaveChangesAsync();

        if (isFirstClick)
        {
            await PropagateFirstClickAsync(sentEmailId, clickedAt);
        }
    }

    // Deliberately not migrated to stage-only + IUnitOfWork.SaveChangesAsync, same reasoning as
    // UserRepository.UpsertAsync — see that method's doc comment for why a native upsert (here,
    // ON CONFLICT DO NOTHING) replaces a SELECT-then-INSERT race entirely, instead of relying on
    // catching the UniqueViolation it would otherwise raise.
    public async Task RegisterSignedClickAsync(string token, Guid sentEmailId, string linkKey, string destinationUrl, DateTime clickedAt)
    {
        var existing = await dbContext.EmailLinkClicks.FirstOrDefaultAsync(e => e.Token == token);
        if (existing is not null)
        {
            await RegisterClickAsync(token, clickedAt);
            return;
        }

        var inserted = await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "EmailLinkClicks" ("Token", "SentEmailId", "LinkKey", "DestinationUrl", "CreatedAt", "FirstClickedAt", "LastClickedAt", "ClickCount")
            VALUES ({0}, {1}, {2}, {3}, {4}, {4}, {4}, 1)
            ON CONFLICT ("Token") DO NOTHING
            """,
            token, sentEmailId, linkKey, destinationUrl, clickedAt);

        if (inserted == 0)
        {
            // Lost a race with a concurrent click on the same link — the token is deterministic
            // per (SentEmail, linkKey), so a simultaneous click on the same link can beat us to
            // the insert. Fall back to updating the winner's row instead.
            await RegisterClickAsync(token, clickedAt);
            return;
        }

        await PropagateFirstClickAsync(sentEmailId, clickedAt);
    }

    private Task PropagateFirstClickAsync(Guid sentEmailId, DateTime clickedAt) =>
        dbContext.SentEmails
            .Where(e => e.Id == sentEmailId && e.FirstClickedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(e => e.FirstClickedAt, clickedAt));
}
