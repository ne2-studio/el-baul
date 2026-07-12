namespace ElBaul.Ports.Output;

public interface IPhotoRepository
{
    Task<Photo?> GetByIdAsync(Guid id);
    Task<IEnumerable<Photo>> GetByAlbumIdAsync(Guid albumId);
    Task<IEnumerable<Photo>> GetPreviewPhotosAsync(Guid baulId, int limit);
    Task CreateAsync(Photo photo);
    Task DeleteAsync(Guid id);
}
