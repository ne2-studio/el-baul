using ElBaul.Ports.Output;

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

    public Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && p.CreatedAt >= since).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetPreviewPhotosAsync(BaulId baulId, int limit)
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active).OrderByDescending(p => p.CreatedAt).Take(limit).ToList().AsEnumerable());
    }

    public Task<IEnumerable<Photo>> GetUndatedAsync()
    {
        lock (_lock) return Task.FromResult(_photos.Values.Where(p => p.Date == null && p.Status == PhotoStatus.Active).ToList().AsEnumerable());
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

    public Task DeleteAsync(PhotoId id)
    {
        lock (_lock) _photos.Remove(id);
        return Task.CompletedTask;
    }
}
