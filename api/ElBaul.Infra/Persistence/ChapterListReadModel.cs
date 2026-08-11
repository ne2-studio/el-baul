using ElBaul.Application.Chapters;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

/// <summary>
/// See IChapterListReadModel's doc comment for why this exists. Three baúl-scoped queries
/// (chapters, active chapter-linked photos, chapter-linked recuerdos) replace the N+1
/// ChapterManager.GetByBaulIdAsync used to run, regardless of how many chapters the baúl has —
/// grouping and the recuerdo/date-range aggregation happen in memory afterward, the same shape
/// AdminRepository already uses for its own cross-aggregate counts (see AdminRepository.cs).
/// </summary>
public class ChapterListReadModel(ElBaulDbContext dbContext) : IChapterListReadModel
{
    public async Task<IReadOnlyList<ChapterListRow>> GetByBaulIdAsync(BaulId baulId)
    {
        var chapters = await dbContext.Chapters.AsNoTracking()
            .Where(c => c.BaulId == baulId)
            .ToListAsync();
        if (chapters.Count == 0) return [];

        var photosByChapter = (await dbContext.Photos.AsNoTracking()
                .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && p.ChapterId != null)
                .ToListAsync())
            .GroupBy(p => p.ChapterId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var recuerdosByChapter = (await dbContext.Recuerdos.AsNoTracking()
                .Where(r => r.BaulId == baulId && r.ChapterId != null)
                .ToListAsync())
            .GroupBy(r => r.ChapterId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        return chapters
            .Select(chapter => ChapterListRowFactory.Build(
                chapter,
                photosByChapter.GetValueOrDefault(chapter.Id, []),
                recuerdosByChapter.GetValueOrDefault(chapter.Id, [])))
            .ToList();
    }
}
