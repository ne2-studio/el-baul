using ElBaul.OutputPorts.Photos;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

/// <summary>
/// See IPhotoListReadModel's doc comment for why this exists. Each listing query fetches
/// matching Photos directly against ElBaulDbContext (reusing PhotoOrdering for GetPageAsync's
/// chronological order, exactly like PhotoRepository.GetPageAsync does), then one batched
/// recuerdo-count query for just those photo ids — two queries total per listing regardless of
/// how many photos it returns.
/// </summary>
public class PhotoListReadModel(ElBaulDbContext dbContext) : IPhotoListReadModel
{
    public Task<IReadOnlyList<PhotoListRow>> GetByChapterIdAsync(ChapterId chapterId) =>
        BuildRowsAsync(dbContext.Photos.AsNoTracking()
            .Where(p => p.ChapterId == chapterId && p.Status == PhotoStatus.Active));

    public Task<IReadOnlyList<PhotoListRow>> GetLooseByBaulIdAsync(BaulId baulId) =>
        BuildRowsAsync(dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.ChapterId == null && p.Status == PhotoStatus.Active));

    public Task<IReadOnlyList<PhotoListRow>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take) =>
        BuildRowsAsync(dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && (chapterId == null || p.ChapterId == chapterId))
            .OrderByChronology()
            .Skip(skip)
            .Take(take));

    public Task<IReadOnlyList<PhotoListRow>> GetActiveByIdsAsync(BaulId baulId, IEnumerable<PhotoId> photoIds)
    {
        var ids = photoIds.ToList();
        return BuildRowsAsync(dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && ids.Contains(p.Id))
            .OrderByChronology());
    }

    public async Task<PhotoListRow?> GetUntaggedSuggestionAsync(BaulId baulId)
    {
        // OrderBy(EF.Functions.Random()) becomes `ORDER BY random()` on Postgres — the
        // suggestion should vary between visits instead of always landing on the same
        // (e.g. oldest) untagged photo, so this can't be an OrderBy on any stored column.
        var rows = await BuildRowsAsync(dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && !p.ConfirmedNoPersonas)
            .Where(p => !dbContext.PhotoPersonaTags.Any(t => t.PhotoId == p.Id))
            .OrderBy(_ => EF.Functions.Random())
            .Take(1));
        return rows.Count > 0 ? rows[0] : null;
    }

    private async Task<IReadOnlyList<PhotoListRow>> BuildRowsAsync(IQueryable<Photo> query)
    {
        var photos = await query.ToListAsync();
        if (photos.Count == 0) return [];

        var photoIds = photos.Select(p => p.Id).ToList();
        var recuerdoCounts = await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.PhotoId != null && photoIds.Contains(r.PhotoId.Value))
            .GroupBy(r => r.PhotoId!.Value)
            .Select(g => new { PhotoId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PhotoId, x => x.Count);

        return photos.Select(p => PhotoListRowFactory.Build(p, recuerdoCounts.GetValueOrDefault(p.Id))).ToList();
    }
}
