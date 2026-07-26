using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ElBaul.Infra;

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

    public async Task RegisterSignedClickAsync(string token, Guid sentEmailId, string linkKey, string destinationUrl, DateTime clickedAt)
    {
        var existing = await dbContext.EmailLinkClicks.FirstOrDefaultAsync(e => e.Token == token);
        if (existing is not null)
        {
            await RegisterClickAsync(token, clickedAt);
            return;
        }

        dbContext.EmailLinkClicks.Add(new EmailLinkClick(
            token, sentEmailId, linkKey, destinationUrl, clickedAt, clickedAt, clickedAt, ClickCount: 1));

        try
        {
            await dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Lost a race with a concurrent click on the same link — the token is deterministic
            // per (SentEmail, linkKey), so a simultaneous click on the same link can beat us to
            // the insert. Detach our losing copy and fall back to updating the winner's row.
            dbContext.Entry(dbContext.EmailLinkClicks.Local.Single(e => e.Token == token)).State = EntityState.Detached;
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
