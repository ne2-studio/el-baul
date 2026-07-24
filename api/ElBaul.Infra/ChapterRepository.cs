using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class ChapterRepository(ElBaulDbContext dbContext) : IChapterRepository
{
    public Task<Chapter?> GetByIdAsync(Guid id) =>
        dbContext.Chapters.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);

    public async Task<IEnumerable<Chapter>> GetByBaulIdAsync(Guid baulId) =>
        await dbContext.Chapters.AsNoTracking().Where(a => a.BaulId == baulId).ToListAsync();

    public async Task<IEnumerable<Chapter>> GetCreatedSinceAsync(Guid baulId, DateTime since) =>
        await dbContext.Chapters.AsNoTracking()
            .Where(a => a.BaulId == baulId && a.CreatedAt >= since)
            .ToListAsync();

    public async Task CreateAsync(Chapter chapter)
    {
        dbContext.Chapters.Add(chapter);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdateAsync(Chapter chapter)
    {
        dbContext.Chapters.Update(chapter);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        await dbContext.Chapters.Where(a => a.Id == id).ExecuteDeleteAsync();
    }
}
