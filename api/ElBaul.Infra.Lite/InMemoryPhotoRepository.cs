using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemoryPhotoRepository : IPhotoRepository
{
    private readonly Dictionary<PhotoId, Photo> _photos = new();
    private readonly Lock _lock = new();

    public Task<Photo?> GetByIdAsync(PhotoId id)
    {
        lock (_lock) return Task.FromResult(_photos.GetValueOrDefault(id));
    }

    public Task<IEnumerable<Photo>> GetByIdsAsync(IEnumerable<PhotoId> ids)
    {
        lock (_lock)
        {
            var idSet = ids.ToHashSet();
            return Task.FromResult(_photos.Values.Where(p => idSet.Contains(p.Id)).ToList().AsEnumerable());
        }
    }

    public Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.FirstOrDefault(p => p.ClientUploadId == clientUploadId));
    }

    public Task<IEnumerable<Photo>> GetByChapterIdAsync(ChapterId chapterId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.ChapterId == chapterId && p.Status == PhotoStatus.Active).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.ChapterId == null && p.Status == PhotoStatus.Active).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetActiveByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, string excludingUserId)
    {
        lock (_lock)
            return Task.FromResult(_photos.Values
                .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && p.CreatedAt >= since
                    && p.UploadedBy != excludingUserId)
                .ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetPreviewPhotosAsync(BaulId baulId, int limit)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active).OrderByDescending(p => p.CreatedAt).Take(limit).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetUndatedAsync()
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.Date == null && p.Status == PhotoStatus.Active).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetMissingSizeBytesAsync()
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.SizeBytes == 0).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetMissingUploadBatchIdAsync()
    {
        lock (_lock)
            return Task.FromResult(_photos.Values
                .Where(p => p.UploadBatchId == null && p.Status == PhotoStatus.Active)
                .OrderBy(p => p.BaulId.Value).ThenBy(p => p.ChapterId?.Value).ThenBy(p => p.UploadedBy).ThenBy(p => p.CreatedAt)
                .ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take)
    {
        lock (_lock)
        {
            var page = _photos.Values
                .Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && (chapterId == null || p.ChapterId == chapterId))
                .OrderByChronology()
                .Skip(skip)
                .Take(take)
                .ToList();
            return Task.FromResult(page.AsEnumerable());
        }
    }

    public Task CreateAsync(Photo photo)
    {
        lock (_lock) _photos[photo.Id] = photo;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Photo photo)
    {
        lock (_lock) _photos[photo.Id] = photo;
        return Task.CompletedTask;
    }

    public Task<IEnumerable<Photo>> GetAllByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId).ToList().AsEnumerable());
    }

    public Task DeleteAsync(PhotoId id)
    {
        lock (_lock) _photos.Remove(id);
        return Task.CompletedTask;
    }

    public Task DeleteByBaulIdAsync(BaulId baulId)
    {
        lock (_lock)
        {
            var ids = _photos.Values.Where(p => p.BaulId == baulId).Select(p => p.Id).ToList();
            foreach (var id in ids) _photos.Remove(id);
        }
        return Task.CompletedTask;
    }
}
