namespace ElBaul.Ports.Output;

public interface IRecuerdoRepository
{
    Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(Guid photoId);
    Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<Guid> photoIds);
    Task<IEnumerable<Recuerdo>> GetByAlbumIdAsync(Guid albumId);

    /// <summary>All recuerdos in a baúl — photo-attached, album-attached, and standalone —
    /// newest first.</summary>
    Task<IEnumerable<Recuerdo>> GetByBaulIdAsync(Guid baulId);

    Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(Guid baulId, DateTime since);

    /// <summary>Recuerdos that have a Photo but no AlbumId yet — used only by the one-off
    /// backfill command (see Tools/BackfillRecuerdoAlbumIdCommand.cs).</summary>
    Task<IEnumerable<Recuerdo>> GetWithPhotoAndNoAlbumAsync();

    Task CreateAsync(Recuerdo recuerdo);
    Task UpdateAsync(Recuerdo recuerdo);
}
