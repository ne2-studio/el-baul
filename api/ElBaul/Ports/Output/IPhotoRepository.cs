namespace ElBaul.Ports.Output;

public interface IPhotoRepository
{
    Task<Photo?> GetByIdAsync(Guid id);
    Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId);
    Task<IEnumerable<Photo>> GetByAlbumIdAsync(Guid albumId);
    Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(Guid baulId);
    Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(Guid baulId, DateTime since);
    Task<IEnumerable<Photo>> GetPreviewPhotosAsync(Guid baulId, int limit);
    Task<IEnumerable<Photo>> GetUndatedAsync();

    /// <summary>Active photos with a non-empty caption — used only by the one-off
    /// migrate-photo-captions-to-recuerdos command (see
    /// ElBaul.Maintenance/Commands/MigratePhotoCaptionsToRecuerdosCommand.cs).</summary>
    Task<IEnumerable<Photo>> GetWithCaptionAsync();

    Task CreateAsync(Photo photo);
    Task UpdateAsync(Photo photo);
    Task DeleteAsync(Guid id);
}
