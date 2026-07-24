namespace ElBaul.Ports.Output;

public interface IChapterRepository
{
    Task<Chapter?> GetByIdAsync(Guid id);
    Task<IEnumerable<Chapter>> GetByBaulIdAsync(Guid baulId);
    Task<IEnumerable<Chapter>> GetCreatedSinceAsync(Guid baulId, DateTime since);
    Task CreateAsync(Chapter chapter);
    Task UpdateAsync(Chapter chapter);
    Task DeleteAsync(Guid id);
}
