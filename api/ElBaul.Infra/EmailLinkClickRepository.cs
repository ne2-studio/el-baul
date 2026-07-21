using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class EmailLinkClickRepository(ElBaulDbContext dbContext) : IEmailLinkClickRepository
{
    public Task<EmailLinkClick?> GetByTokenAsync(string token) =>
        dbContext.EmailLinkClicks.AsNoTracking().FirstOrDefaultAsync(e => e.Token == token);

    public async Task CreateManyAsync(IEnumerable<EmailLinkClick> links)
    {
        dbContext.EmailLinkClicks.AddRange(links);
        await dbContext.SaveChangesAsync();
    }

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
            await dbContext.SentEmails
                .Where(e => e.Id == sentEmailId && e.FirstClickedAt == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(e => e.FirstClickedAt, clickedAt));
        }
    }
}
