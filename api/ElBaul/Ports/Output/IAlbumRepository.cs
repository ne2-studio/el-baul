namespace ElBaul.Ports.Output;

public interface IAlbumRepository
{
    Task<Album?> GetByIdAsync(Guid id);
    Task<IEnumerable<Album>> GetByBaulIdAsync(Guid baulId);
    Task<IEnumerable<Album>> GetCreatedSinceAsync(Guid baulId, DateTime since);
    Task CreateAsync(Album album);
    Task UpdateAsync(Album album);
    Task DeleteAsync(Guid id);
}
