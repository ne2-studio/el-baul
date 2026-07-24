using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryChapterRepository : IChapterRepository
{
    private readonly Dictionary<Guid, Chapter> _chapters = new();

    public Task<Chapter?> GetByIdAsync(Guid id) => Task.FromResult(_chapters.GetValueOrDefault(id));

    public Task<IEnumerable<Chapter>> GetByBaulIdAsync(Guid baulId) =>
        Task.FromResult(_chapters.Values.Where(a => a.BaulId == baulId));

    public Task<IEnumerable<Chapter>> GetCreatedSinceAsync(Guid baulId, DateTime since) =>
        Task.FromResult(_chapters.Values.Where(a => a.BaulId == baulId && a.CreatedAt >= since));

    public Task CreateAsync(Chapter chapter)
    {
        _chapters[chapter.Id] = chapter;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Chapter chapter)
    {
        _chapters[chapter.Id] = chapter;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Guid id)
    {
        _chapters.Remove(id);
        return Task.CompletedTask;
    }
}
