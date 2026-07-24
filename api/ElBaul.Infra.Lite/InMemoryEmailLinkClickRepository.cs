using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemoryEmailLinkClickRepository : IEmailLinkClickRepository
{
    private readonly Dictionary<string, EmailLinkClick> _links = new();
    private readonly Lock _lock = new();

    public Task<EmailLinkClick?> GetByTokenAsync(string token)
    {
        lock (_lock) return Task.FromResult(_links.GetValueOrDefault(token));
    }

    public Task CreateManyAsync(IEnumerable<EmailLinkClick> links)
    {
        lock (_lock)
        {
            foreach (var link in links) _links[link.Token] = link;
        }
        return Task.CompletedTask;
    }

    public Task RegisterClickAsync(string token, DateTime clickedAt)
    {
        lock (_lock)
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
        }
        return Task.CompletedTask;
    }

    public IReadOnlyCollection<EmailLinkClick> All
    {
        get { lock (_lock) return _links.Values.ToList(); }
    }
}
