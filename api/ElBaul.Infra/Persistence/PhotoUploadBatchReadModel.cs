using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

/// <summary>See IPhotoUploadBatchReadModel's doc comment for why this exists. Fetches every
/// active, batch-tagged Photo for the baúl (or one batch) in a single query, then groups/builds
/// rows in memory via PhotoUploadBatchRowFactory — same shape as RecuerdoListReadModel.</summary>
public class PhotoUploadBatchReadModel(ElBaulDbContext dbContext) : IPhotoUploadBatchReadModel
{
    public async Task<IReadOnlyList<PhotoUploadBatchRow>> GetByBaulIdAsync(BaulId baulId)
    {
        var photos = await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && p.UploadBatchId != null)
            .ToListAsync();
        if (photos.Count == 0) return [];

        var recuerdoCounts = await GetRecuerdoCountsAsync(photos.Select(p => p.Id));
        var chapterNamesById = await GetChapterNamesAsync(photos);

        return PhotoUploadBatchRowFactory.Build(photos, recuerdoCounts, chapterNamesById);
    }

    public async Task<IReadOnlyList<PhotoListRow>> GetPhotosByBatchIdAsync(BaulId baulId, Guid batchId)
    {
        var photos = await dbContext.Photos.AsNoTracking()
            .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && p.UploadBatchId == batchId)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();
        if (photos.Count == 0) return [];

        var recuerdoCounts = await GetRecuerdoCountsAsync(photos.Select(p => p.Id));
        return photos.Select(p => PhotoListRowFactory.Build(p, recuerdoCounts.GetValueOrDefault(p.Id))).ToList();
    }

    private async Task<Dictionary<PhotoId, int>> GetRecuerdoCountsAsync(IEnumerable<PhotoId> photoIds)
    {
        var ids = photoIds.ToList();
        return await dbContext.Recuerdos.AsNoTracking()
            .Where(r => r.PhotoId != null && ids.Contains(r.PhotoId.Value))
            .GroupBy(r => r.PhotoId!.Value)
            .Select(g => new { PhotoId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PhotoId, x => x.Count);
    }

    private async Task<Dictionary<ChapterId, string>> GetChapterNamesAsync(IEnumerable<Photo> photos)
    {
        var chapterIds = photos.Where(p => p.ChapterId is not null).Select(p => p.ChapterId!.Value).Distinct().ToList();
        if (chapterIds.Count == 0) return new Dictionary<ChapterId, string>();

        return await dbContext.Chapters.AsNoTracking()
            .Where(c => chapterIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name);
    }
}
