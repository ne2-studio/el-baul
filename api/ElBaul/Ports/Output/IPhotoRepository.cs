namespace ElBaul.Ports.Output;

public interface IPhotoRepository
{
    Task<Photo?> GetByIdAsync(Guid id);
    Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId);
    Task<IEnumerable<Photo>> GetByAlbumIdAsync(Guid albumId);
    Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(Guid baulId);
    Task<IEnumerable<Photo>> GetPreviewPhotosAsync(Guid baulId, int limit);
    Task<IEnumerable<Photo>> GetUndatedAsync();
    Task CreateAsync(Photo photo);
    Task UpdateAsync(Photo photo);
    Task DeleteAsync(Guid id);
}
