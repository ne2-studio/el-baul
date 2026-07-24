namespace ElBaul.Ports.Output;

/// <summary>Minimal shape of a recuerdo still missing BaulId — used only by the one-off
/// backfill command (see ElBaul.Maintenance/Commands/BackfillRecuerdoBaulIdCommand.cs). Recuerdo.BaulId is a
/// non-nullable Guid in the domain model (the target state once the follow-up migration
/// lands), but the DB column is still nullable for legacy rows until that command finishes —
/// reading affected rows through the normal Recuerdo entity would throw when materializing a
/// null column value into a non-nullable Guid, so this is a raw, minimal projection instead.</summary>
// Raw Guid, not RecuerdoId/PhotoId/ChapterId: materialized via SqlQueryRaw, which bypasses
// the normal EF model (and its value converters) entirely — see GetCandidatesWithNoBaulIdAsync.
public record RecuerdoBaulIdCandidate(Guid Id, Guid? PhotoId, Guid? ChapterId);

public interface IRecuerdoRepository
{
    Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(PhotoId photoId);
    Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<PhotoId> photoIds);
    Task<IEnumerable<Recuerdo>> GetByChapterIdAsync(ChapterId chapterId);

    /// <summary>All recuerdos in a baúl — photo-attached, chapter-attached, and standalone —
    /// newest first.</summary>
    Task<IEnumerable<Recuerdo>> GetByBaulIdAsync(BaulId baulId);

    Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since);

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
    Task SetBaulIdAsync(RecuerdoId recuerdoId, BaulId baulId);

    Task CreateAsync(Recuerdo recuerdo);
    Task UpdateAsync(Recuerdo recuerdo);
}
