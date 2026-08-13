using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// Computes IChapterListReadModel's per-chapter aggregates over the same in-memory stores
// IChapterRepository/IPhotoRepository/IRecuerdoRepository already hold — not a separately-seeded
// fake like InMemoryAdminRepository — so BaulFixture-driven tests (and el-baul-api-lite) see this
// read model reflect whatever a test already seeded through those repositories, with no extra
// seeding step to keep in sync. Row assembly itself (recuerdo/date-range math) is shared with
// ChapterListReadModel via ChapterListRowFactory, so the two implementations can't drift.
public class InMemoryChapterListReadModel(
    IChapterRepository chapterRepository, IPhotoRepository photoRepository, IRecuerdoRepository recuerdoRepository)
    : IChapterListReadModel
{
    public async Task<IReadOnlyList<ChapterListRow>> GetByBaulIdAsync(BaulId baulId)
    {
        var chapters = (await chapterRepository.GetByBaulIdAsync(baulId)).ToList();
        if (chapters.Count == 0) return [];

        var photosByChapter = (await photoRepository.GetAllByBaulIdAsync(baulId))
            .Where(p => p.Status == PhotoStatus.Active && p.ChapterId is not null)
            .GroupBy(p => p.ChapterId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var recuerdosByChapter = (await recuerdoRepository.GetByBaulIdAsync(baulId))
            .Where(r => r.ChapterId is not null)
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
