using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryPhotoRepository : IPhotoRepository
{
    private readonly Dictionary<PhotoId, Photo> _photos = new();

    public Task<Photo?> GetByIdAsync(PhotoId id) => Task.FromResult(_photos.GetValueOrDefault(id));

    public Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId) =>
        Task.FromResult(_photos.Values.FirstOrDefault(p => p.ClientUploadId == clientUploadId));

    public Task<IEnumerable<Photo>> GetByChapterIdAsync(ChapterId chapterId) =>
        Task.FromResult(_photos.Values.Where(p => p.ChapterId == chapterId && p.Status == PhotoStatus.Active));

    public Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId) =>
        Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.ChapterId == null && p.Status == PhotoStatus.Active));

    public Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since) =>
        Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active && p.CreatedAt >= since));

    public Task<IEnumerable<Photo>> GetPreviewPhotosAsync(BaulId baulId, int limit) =>
        Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.Status == PhotoStatus.Active).OrderByDescending(p => p.CreatedAt).Take(limit));

    public Task<IEnumerable<Photo>> GetUndatedAsync() =>
        Task.FromResult(_photos.Values.Where(p => p.Date == null && p.Status == PhotoStatus.Active));

    public Task CreateAsync(Photo photo)
    {
        _photos[photo.Id] = photo;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Photo photo)
    {
        _photos[photo.Id] = photo;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(PhotoId id)
    {
        _photos.Remove(id);
        return Task.CompletedTask;
    }
}
