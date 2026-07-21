using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryAlbumRepository : IAlbumRepository
{
    private readonly Dictionary<Guid, Album> _albums = new();

    public Task<Album?> GetByIdAsync(Guid id) => Task.FromResult(_albums.GetValueOrDefault(id));

    public Task<IEnumerable<Album>> GetByBaulIdAsync(Guid baulId) =>
        Task.FromResult(_albums.Values.Where(a => a.BaulId == baulId));

    public Task<IEnumerable<Album>> GetCreatedSinceAsync(Guid baulId, DateTime since) =>
        Task.FromResult(_albums.Values.Where(a => a.BaulId == baulId && a.CreatedAt >= since));

    public Task CreateAsync(Album album)
    {
        _albums[album.Id] = album;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Album album)
    {
        _albums[album.Id] = album;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Guid id)
    {
        _albums.Remove(id);
        return Task.CompletedTask;
    }
}
