namespace ElBaul.Ports.Output;

public interface IRecuerdoRepository
{
    Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(Guid photoId);
    Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<Guid> photoIds);
    Task<IEnumerable<Recuerdo>> GetByAlbumIdAsync(Guid albumId);

    /// <summary>
    /// Recuerdos created since a given date whose Photo or Album resolves to the given baúl
    /// — Recuerdo has no BaulId of its own, same join Baul.Id resolution as
    /// AdminRepository.GetBaulDetailAsync's recuerdo count.
    /// </summary>
    Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(Guid baulId, DateTime since);

    /// <summary>Recuerdos that have a Photo but no AlbumId yet — used only by the one-off
    /// backfill command (see Tools/BackfillRecuerdoAlbumIdCommand.cs).</summary>
    Task<IEnumerable<Recuerdo>> GetWithPhotoAndNoAlbumAsync();

    Task CreateAsync(Recuerdo recuerdo);
    Task UpdateAsync(Recuerdo recuerdo);
}
