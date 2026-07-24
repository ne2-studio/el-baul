using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

public class InMemoryChapterRepository : IChapterRepository
{
    private readonly Dictionary<ChapterId, Chapter> _chapters = new();

    public Task<Chapter?> GetByIdAsync(ChapterId id) => Task.FromResult(_chapters.GetValueOrDefault(id));

    public Task<IEnumerable<Chapter>> GetByBaulIdAsync(BaulId baulId) =>
        Task.FromResult(_chapters.Values.Where(a => a.BaulId == baulId));

    public Task<IEnumerable<Chapter>> GetCreatedSinceAsync(BaulId baulId, DateTime since) =>
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

    public Task DeleteAsync(ChapterId id)
    {
        _chapters.Remove(id);
        return Task.CompletedTask;
    }
}
