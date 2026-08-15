using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// Computes IPhotoUploadBatchReadModel's rows over the same in-memory stores IPhotoRepository/
// IRecuerdoRepository/IChapterRepository already hold — not a separately-seeded fake. Row
// assembly is shared with PhotoUploadBatchReadModel via PhotoUploadBatchRowFactory.
public class InMemoryPhotoUploadBatchReadModel(
    IPhotoRepository photoRepository, IRecuerdoRepository recuerdoRepository, IChapterRepository chapterRepository)
    : IPhotoUploadBatchReadModel
{
    public async Task<IReadOnlyList<PhotoUploadBatchRow>> GetByBaulIdAsync(BaulId baulId)
    {
        var photos = (await photoRepository.GetActiveByBaulIdAsync(baulId))
            .Where(p => p.UploadBatchId is not null)
            .ToList();
        if (photos.Count == 0) return [];

        var recuerdoCounts = await GetRecuerdoCountsAsync(photos.Select(p => p.Id));
        var chapterNamesById = await GetChapterNamesAsync(baulId, photos);

        return PhotoUploadBatchRowFactory.Build(photos, recuerdoCounts, chapterNamesById);
    }

    public async Task<IReadOnlyList<PhotoListRow>> GetPhotosByBatchIdAsync(BaulId baulId, Guid batchId)
    {
        var photos = (await photoRepository.GetActiveByBaulIdAsync(baulId))
            .Where(p => p.UploadBatchId == batchId)
            .OrderBy(p => p.CreatedAt)
            .ToList();
        if (photos.Count == 0) return [];

        var recuerdoCounts = await GetRecuerdoCountsAsync(photos.Select(p => p.Id));
        return photos.Select(p => PhotoListRowFactory.Build(p, recuerdoCounts.GetValueOrDefault(p.Id))).ToList();
    }

    private async Task<Dictionary<PhotoId, int>> GetRecuerdoCountsAsync(IEnumerable<PhotoId> photoIds)
    {
        var recuerdos = await recuerdoRepository.GetByPhotoIdsAsync(photoIds);
        return recuerdos.GroupBy(r => r.PhotoId!.Value).ToDictionary(g => g.Key, g => g.Count());
    }

    private async Task<Dictionary<ChapterId, string>> GetChapterNamesAsync(BaulId baulId, IEnumerable<Photo> photos)
    {
        var chapterIds = photos.Where(p => p.ChapterId is not null).Select(p => p.ChapterId!.Value).Distinct().ToList();
        if (chapterIds.Count == 0) return new Dictionary<ChapterId, string>();

        return (await chapterRepository.GetByBaulIdAsync(baulId))
            .Where(c => chapterIds.Contains(c.Id))
            .ToDictionary(c => c.Id, c => c.Name);
    }
}
