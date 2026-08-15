using ElBaul.Core.Chapters.OutputPorts;

using ElBaul.Domain;
namespace ElBaul.Infra.PersistenceTests.Fakes;

/// <summary>
/// Delegates every call to a real ChapterRepository except DeleteByBaulIdAsync, which throws
/// instead — lets a test simulate "the cascade fails partway through" against a real Postgres
/// transaction without needing a second, fully-hand-rolled fake repository. See
/// AdminManagerHardDeleteTests' rollback test.
/// </summary>
public class ThrowingChapterRepository(IChapterRepository inner) : IChapterRepository
{
    public Task<Chapter?> GetByIdAsync(ChapterId id) => inner.GetByIdAsync(id);

    public Task<IEnumerable<Chapter>> GetByBaulIdAsync(BaulId baulId) => inner.GetByBaulIdAsync(baulId);

    public Task<IEnumerable<Chapter>> GetCreatedSinceAsync(BaulId baulId, DateTime since, string excludingUserId) =>
        inner.GetCreatedSinceAsync(baulId, since, excludingUserId);

    public Task CreateAsync(Chapter chapter) => inner.CreateAsync(chapter);

    public Task UpdateAsync(Chapter chapter) => inner.UpdateAsync(chapter);

    public Task DeleteAsync(ChapterId id) => inner.DeleteAsync(id);

    public Task DeleteByBaulIdAsync(BaulId baulId) =>
        throw new InvalidOperationException("Simulated failure partway through the delete cascade");
}
