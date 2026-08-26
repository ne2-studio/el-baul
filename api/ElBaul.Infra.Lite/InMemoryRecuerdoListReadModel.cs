using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// Computes IRecuerdoListReadModel's rows over the same in-memory stores IRecuerdoRepository/
// IPhotoRepository/IChapterRepository already hold — not a separately-seeded fake — so
// BaulFixture-driven tests (and el-baul-api-lite) see this read model reflect whatever a test
// already seeded through those repositories. Row assembly is shared with RecuerdoListReadModel
// via RecuerdoListRowFactory.
public class InMemoryRecuerdoListReadModel(
    IRecuerdoRepository recuerdoRepository, IPhotoRepository photoRepository, IChapterRepository chapterRepository)
    : IRecuerdoListReadModel
{
    public async Task<IReadOnlyList<RecuerdoListRow>> GetByBaulIdAsync(BaulId baulId) =>
        await BuildAsync((await recuerdoRepository.GetByBaulIdAsync(baulId)).ToList());

    public async Task<IReadOnlyList<RecuerdoListRow>> GetByChapterIdAsync(ChapterId chapterId) =>
        await BuildAsync((await recuerdoRepository.GetByChapterIdAsync(chapterId)).ToList());

    public async Task<IReadOnlyList<RecuerdoListRow>> GetByPhotoIdAsync(PhotoId photoId) =>
        await BuildAsync((await recuerdoRepository.GetByPhotoIdAsync(photoId)).ToList());

    private async Task<IReadOnlyList<RecuerdoListRow>> BuildAsync(List<Recuerdo> recuerdos)
    {
        if (recuerdos.Count == 0) return [];

        // Not status-filtered — matches IPhotoRepository.GetByIdsAsync, which this replaces.
        // Full Photo entities (not just storage keys) so the factory can also resolve each
        // photo-scoped row's *current* chapter live, instead of trusting the recuerdo's own
        // possibly-stale ChapterId snapshot — see #60.
        var photoIds = recuerdos.Where(r => r.PhotoId is not null).Select(r => r.PhotoId!.Value).Distinct().ToList();
        var photosById = photoIds.Count == 0
            ? new Dictionary<PhotoId, Photo>()
            : (await photoRepository.GetByIdsAsync(photoIds)).ToDictionary(p => p.Id);

        // Chapter names are needed both for chapter-scoped recuerdos' own ChapterId and for
        // photo-scoped recuerdos' live-resolved chapter (from photosById above) — every recuerdo
        // in this batch shares the same BaulId (it's always denormalized onto the row), so one
        // GetByBaulIdAsync covers every chapter name this listing could need.
        var chapterIds = recuerdos.Where(r => r.PhotoId is null && r.ChapterId is not null).Select(r => r.ChapterId!.Value)
            .Concat(photosById.Values.Where(p => p.ChapterId is not null).Select(p => p.ChapterId!.Value))
            .Distinct().ToList();
        var chapterNamesById = chapterIds.Count == 0
            ? new Dictionary<ChapterId, string>()
            : (await chapterRepository.GetByBaulIdAsync(recuerdos[0].BaulId))
                .Where(c => chapterIds.Contains(c.Id))
                .ToDictionary(c => c.Id, c => c.Name);

        return RecuerdoListRowFactory.Build(recuerdos, photosById, chapterNamesById);
    }
}
