using ElBaul.OutputPorts.Recuerdos;
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
        // a recuerdo attached to a since-removed photo still resolves whatever storage key
        // that photo row has.
        var photoIds = recuerdos.Where(r => r.PhotoId is not null).Select(r => r.PhotoId!.Value).Distinct().ToList();
        var photoKeysById = photoIds.Count == 0
            ? new Dictionary<PhotoId, string>()
            : await dbContext.Photos.AsNoTracking().Where(p => photoIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.StorageKey);

        var chapterIds = recuerdos.Where(r => r.ChapterId is not null).Select(r => r.ChapterId!.Value).Distinct().ToList();
        var chapterNamesById = chapterIds.Count == 0
            ? new Dictionary<ChapterId, string>()
            : await dbContext.Chapters.AsNoTracking().Where(c => chapterIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Name);

        return RecuerdoListRowFactory.Build(recuerdos, photoKeysById, chapterNamesById);
    }
}
