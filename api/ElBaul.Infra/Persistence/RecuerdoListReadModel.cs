using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Recuerdos.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

/// <summary>
/// See IRecuerdoListReadModel's doc comment for why this exists. Each listing query fetches
/// matching Recuerdos directly against ElBaulDbContext (preserving IRecuerdoRepository's
/// per-scope ordering — oldest-first for a photo, newest-first for a chapter/baúl), then one
/// batched Photos query and one batched Chapters query for just the ids that list actually
/// references — three queries total per listing regardless of how many recuerdos it returns.
/// </summary>
public class RecuerdoListReadModel(ElBaulDbContext dbContext) : IRecuerdoListReadModel
{
    public Task<IReadOnlyList<RecuerdoListRow>> GetByBaulIdAsync(BaulId baulId) =>
        BuildAsync(dbContext.Recuerdos.AsNoTracking().Where(r => r.BaulId == baulId).OrderByDescending(r => r.CreatedAt));

    public Task<IReadOnlyList<RecuerdoListRow>> GetByChapterIdAsync(ChapterId chapterId) =>
        BuildAsync(dbContext.Recuerdos.AsNoTracking().Where(r => r.ChapterId == chapterId).OrderByDescending(r => r.CreatedAt));

    public Task<IReadOnlyList<RecuerdoListRow>> GetByPhotoIdAsync(PhotoId photoId) =>
        BuildAsync(dbContext.Recuerdos.AsNoTracking().Where(r => r.PhotoId == photoId).OrderBy(r => r.CreatedAt));

    private async Task<IReadOnlyList<RecuerdoListRow>> BuildAsync(IQueryable<Recuerdo> query)
    {
        var recuerdos = await query.ToListAsync();
        if (recuerdos.Count == 0) return [];

        // Not status-filtered — matches IPhotoRepository.GetByIdsAsync, which this replaces:
        // a recuerdo attached to a since-removed photo still resolves whatever storage key/
        // chapter that photo row has. Full Photo rows (not just storage keys) so the factory
        // can also resolve each photo-scoped row's *current* chapter live, instead of trusting
        // the recuerdo's own possibly-stale ChapterId snapshot — see #60.
        var photoIds = recuerdos.Where(r => r.PhotoId is not null).Select(r => r.PhotoId!.Value).Distinct().ToList();
        var photosById = photoIds.Count == 0
            ? new Dictionary<PhotoId, Photo>()
            : await dbContext.Photos.AsNoTracking().Where(p => photoIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);

        // Chapter names are needed both for chapter-scoped recuerdos' own ChapterId and for
        // photo-scoped recuerdos' live-resolved chapter (from photosById above).
        var chapterIds = recuerdos.Where(r => r.PhotoId is null && r.ChapterId is not null).Select(r => r.ChapterId!.Value)
            .Concat(photosById.Values.Where(p => p.ChapterId is not null).Select(p => p.ChapterId!.Value))
            .Distinct().ToList();
        var chapterNamesById = chapterIds.Count == 0
            ? new Dictionary<ChapterId, string>()
            : await dbContext.Chapters.AsNoTracking().Where(c => chapterIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Name);

        return RecuerdoListRowFactory.Build(recuerdos, photosById, chapterNamesById);
    }
}
