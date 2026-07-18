using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryPhotoRepository : IPhotoRepository
{
    private readonly Dictionary<Guid, Photo> _photos = new();

    public Task<Photo?> GetByIdAsync(Guid id) => Task.FromResult(_photos.GetValueOrDefault(id));

    public Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId) =>
        Task.FromResult(_photos.Values.FirstOrDefault(p => p.ClientUploadId == clientUploadId));

    public Task<IEnumerable<Photo>> GetByAlbumIdAsync(Guid albumId) =>
        Task.FromResult(_photos.Values.Where(p => p.AlbumId == albumId));

    public Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(Guid baulId) =>
        Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId && p.AlbumId == null));

    public Task<IEnumerable<Photo>> GetPreviewPhotosAsync(Guid baulId, int limit) =>
        Task.FromResult(_photos.Values.Where(p => p.BaulId == baulId).OrderByDescending(p => p.CreatedAt).Take(limit));

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

    public Task DeleteAsync(Guid id)
    {
        _photos.Remove(id);
        return Task.CompletedTask;
    }
}
