namespace ElBaul.Ports.Output;

public interface IChapterRepository
{
    Task<Chapter?> GetByIdAsync(ChapterId id);
    Task<IEnumerable<Chapter>> GetByBaulIdAsync(BaulId baulId);
    Task<IEnumerable<Chapter>> GetCreatedSinceAsync(BaulId baulId, DateTime since);
    Task CreateAsync(Chapter chapter);
    Task UpdateAsync(Chapter chapter);
    Task DeleteAsync(ChapterId id);
}
