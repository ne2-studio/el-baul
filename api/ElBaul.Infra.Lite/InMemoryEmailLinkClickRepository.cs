using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

public class InMemoryEmailLinkClickRepository : IEmailLinkClickRepository
{
    private readonly Dictionary<string, EmailLinkClick> _links = new();

    public Task<EmailLinkClick?> GetByTokenAsync(string token) =>
        Task.FromResult(_links.GetValueOrDefault(token));

    public Task CreateManyAsync(IEnumerable<EmailLinkClick> links)
    {
        foreach (var link in links) _links[link.Token] = link;
        return Task.CompletedTask;
    }

    public Task RegisterClickAsync(string token, DateTime clickedAt)
    {
        if (_links.TryGetValue(token, out var link))
        {
            _links[token] = link with
            {
                FirstClickedAt = link.FirstClickedAt ?? clickedAt,
                LastClickedAt = clickedAt,
                ClickCount = link.ClickCount + 1
            };
        }
        return Task.CompletedTask;
    }

    public IReadOnlyCollection<EmailLinkClick> All => _links.Values;
}
