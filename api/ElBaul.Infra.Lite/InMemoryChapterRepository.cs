using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemoryChapterRepository : IChapterRepository
{
    private readonly Dictionary<ChapterId, Chapter> _chapters = new();
    private readonly Lock _lock = new();

    public Task<Chapter?> GetByIdAsync(ChapterId id)
    {
        lock (_lock) return Task.FromResult(_chapters.GetValueOrDefault(id));
    }

    public Task<IEnumerable<Chapter>> GetByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_chapters.Values.Where(a => a.BaulId == baulId).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Chapter>> GetCreatedSinceAsync(BaulId baulId, DateTime since)
    {
        lock (_lock) return Task.FromResult(_chapters.Values.Where(a => a.BaulId == baulId && a.CreatedAt >= since).ToList().AsEnumerable());
    }

    public Task CreateAsync(Chapter chapter)
    {
        lock (_lock) _chapters[chapter.Id] = chapter;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Chapter chapter)
    {
        lock (_lock) _chapters[chapter.Id] = chapter;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ChapterId id)
    {
        lock (_lock) _chapters.Remove(id);
        return Task.CompletedTask;
    }
}
