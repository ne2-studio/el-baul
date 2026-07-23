namespace ElBaul.Ports.Output;

/// <summary>Minimal shape of a recuerdo still missing BaulId — used only by the one-off
/// backfill command (see ElBaul.Maintenance/Commands/BackfillRecuerdoBaulIdCommand.cs). Recuerdo.BaulId is a
/// non-nullable Guid in the domain model (the target state once the follow-up migration
/// lands), but the DB column is still nullable for legacy rows until that command finishes —
/// reading affected rows through the normal Recuerdo entity would throw when materializing a
/// null column value into a non-nullable Guid, so this is a raw, minimal projection instead.</summary>
public record RecuerdoBaulIdCandidate(Guid Id, Guid? PhotoId, Guid? AlbumId);

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
    /// backfill command (see ElBaul.Maintenance/Commands/BackfillRecuerdoAlbumIdCommand.cs).</summary>
    Task<IEnumerable<Recuerdo>> GetWithPhotoAndNoAlbumAsync();

    /// <summary>Every recuerdo in the system, unscoped — used only by the one-off backfill
    /// command (see ElBaul.Maintenance/Commands/BackfillRecuerdoEmbeddingsCommand.cs).</summary>
    Task<IEnumerable<Recuerdo>> GetAllAsync();

    /// <summary>Recuerdos still missing BaulId — used only by the one-off backfill command
    /// (see ElBaul.Maintenance/Commands/BackfillRecuerdoBaulIdCommand.cs).</summary>
    Task<IEnumerable<RecuerdoBaulIdCandidate>> GetCandidatesWithNoBaulIdAsync();

    /// <summary>Sets BaulId directly via SQL, bypassing the normal entity load/save path —
    /// used only by the one-off backfill command, where the in-memory Recuerdo can't be
    /// safely reconstructed from GetCandidatesWithNoBaulIdAsync's partial projection (it
    /// doesn't carry UserId/Text/CreatedAt, and reloading the full entity would hit the same
    /// null-into-non-nullable-Guid problem the projection exists to avoid).</summary>
    Task SetBaulIdAsync(Guid recuerdoId, Guid baulId);

    Task CreateAsync(Recuerdo recuerdo);
    Task UpdateAsync(Recuerdo recuerdo);
}
